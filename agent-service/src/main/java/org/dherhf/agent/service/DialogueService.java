package org.dherhf.agent.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.TokenStream;
import dev.langchain4j.service.UserMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.enums.IntentEnum;
import org.dherhf.agent.enums.SessionStatusEnum;
import org.dherhf.agent.model.card.CardPayload;
import org.dherhf.agent.model.sse.SseEvent;
import org.dherhf.agent.model.ticket.RequestContext;
import org.dherhf.agent.model.ticket.SlotState;
import org.dherhf.agent.tool.TicketServiceClient;
import org.dherhf.agent.tool.TicketTools;

/**
 * 对话引擎主流程服务。
 * <p>
 * 流程：用户输入 → 输入安全过滤 → 构造 LLM 请求（System Prompt + 上下文 + 历史） →
 * LangChain4j 流式调用 DeepSeek → 工具调用（自动跳步/缺槽追问/上下文修正） →
 * 逐 token SSE 推送 → 输出校验 → 元数据解析 → MongoDB 持久化
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DialogueService {

    private final StreamingChatModel streamingChatModel;
    private final PromptService promptService;
    private final InputFilterService inputFilterService;
    private final OutputValidatorService outputValidatorService;
    private final ContextService contextService;
    private final ChatSessionService chatSessionService;
    private final TitleAgentService titleAgentService;
    private final TicketServiceClient ticketClient;
    private final org.dherhf.agent.tool.AmapClient amapClient;
    private final IdempotentService idempotentService;
    private final ObjectMapper objectMapper;

    @Value("${agent.negate-threshold}")
    private int negateThreshold;

    @Value("${agent.sse-timeout-seconds}")
    private long sseTimeoutSeconds;

    /** 元数据分隔符，LLM 输出内容后以此标记开头输出 JSON 元数据 */
    private static final String META_DELIMITER = "<<<META>>>";

    /** LangChain4j AiService 接口，@MemoryId 绑定 sessionId 用于会话隔离。返回 TokenStream 实现流式输出。 */
    public interface ChatAssistant {
        TokenStream chat(@MemoryId String sessionId, @UserMessage String userMessage);
    }

    /**
     * 为每次请求构建独立的 AiServices 实例，绑定 sessionId 和 TicketTools。
     * 使用 StreamingChatModel 实现 token 级流式输出。
     * 测试时可覆写此方法返回 mock。
     */
    protected ChatAssistant buildChatAssistant(String sessionId, TicketTools tools) {
        return AiServices.builder(ChatAssistant.class)
                .streamingChatModel(streamingChatModel)
                .tools(tools)
                .systemMessageProvider(memoryId -> promptService.getSystemPrompt())
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.builder()
                        .maxMessages(10)
                        .id(memoryId)
                        .build())
                .build();
    }

    private TicketTools createTicketTools(String sessionId) {
        return new TicketTools(ticketClient, amapClient, objectMapper, contextService, idempotentService, sessionId);
    }

    /**
     * 处理用户消息，通过 SSE 流式推送响应。
     *
     * @param sessionId    会话 ID
     * @param userId       用户 ID
     * @param content      用户输入文本
     * @param scheduleId   前端选场次后直接提供（可 null）
     * @param seatIds      前端选座后直接提供（可 null）
     * @param ticketCount  购票数量（=座位数，前端选座时提供，可 null）
     * @param requestId    幂等请求 ID（前端生成，写操作幂等控制，可 null）
     * @param longitude    用户当前经度（GCJ-02，前端高德定位提供，可 null）
     * @param latitude     用户当前纬度（GCJ-02，可 null）
     * @param city         用户当前城市（可 null）
     * @return SseEmitter
     */
    public SseEmitter handleMessage(
            String sessionId,
            Long userId,
            String content,
            Long scheduleId,
            List<Long> seatIds,
            Integer ticketCount,
            String requestId,
            Double longitude,
            Double latitude,
            String city
    ) {
        SseEmitter emitter = new SseEmitter(sseTimeoutSeconds * 1000L);

        var sessionOpt = chatSessionService.getSession(sessionId, userId);
        if (sessionOpt.isEmpty()) {
            sendErrorAndComplete(emitter, ErrorCodeEnum.SESSION_NOT_FOUND);
            return emitter;
        }
        var session = sessionOpt.get();
        if (SessionStatusEnum.COMPLETED.getValue().equals(session.getStatus())) {
            sendErrorAndComplete(emitter, ErrorCodeEnum.SESSION_ENDED);
            return emitter;
        }

        if (!inputFilterService.isSafe(content)) {
            long violations = inputFilterService.recordViolation(userId);
            String tip = violations >= 3
                    ? "检测到多次违规输入，请规范使用。"
                    : "输入内容存在安全风险，请重新描述您的购票需求。";
            sendErrorAndComplete(emitter, ErrorCodeEnum.INPUT_VIOLATION, tip);
            return emitter;
        }

        // 首条消息时由标题 Agent 生成标题
        final boolean needTitle = "新对话".equals(session.getTitle());

        SlotState slotState = contextService.loadSlotState(sessionId);

        // 将前端传入的场次/座位信息写入槽位
        if (scheduleId != null) {
            slotState.setSchedulesId(scheduleId);
        }
        if (seatIds != null) {
            slotState.setSeatIds(seatIds);
        }
        if (ticketCount != null) {
            slotState.setCount(ticketCount);
        }

        // 将请求上下文存入 Redis，TicketTools 通过 sessionId 查询
        RequestContext requestCtx = new RequestContext();
        requestCtx.setUserId(userId);
        requestCtx.setScheduleId(scheduleId);
        requestCtx.setSeatIds(seatIds);
        requestCtx.setTicketCount(ticketCount);
        requestCtx.setRequestId(requestId);
        requestCtx.setLongitude(longitude);
        requestCtx.setLatitude(latitude);
        requestCtx.setCity(city);

        Thread.startVirtualThread(() -> {
            try {
                contextService.storeRequestContext(sessionId, requestCtx);
                processDialogue(emitter, sessionId, content, slotState, longitude, latitude, city, needTitle);
            } catch (Exception ex) {
                log.error("[handleMessage] 对话处理异常: sessionId={}", sessionId, ex);
                try {
                    sendSseEvent(emitter, SseEvent.error("500", "服务异常，请重试"));
                } catch (IOException ignored) {}
                emitter.completeWithError(ex);
            } finally {
                contextService.clearRequestContext(sessionId);
            }
        });

        return emitter;
    }

    /**
     * 流式处理对话：通过 TokenStream 逐 token 推送 SSE，完成后解析元数据并发送 card/done。
     * <p>
     * LLM 按提示词约定先输出 markdown 内容，再以 &lt;&lt;&lt;META&gt;&gt;&gt; 分隔输出 JSON 元数据。
     * 流式阶段仅推送分隔符之前的 token；完成后解析 JSON 提取 intent/slots。
     * </p>
     */
    private void processDialogue(
            SseEmitter emitter,
            String sessionId,
            String content,
            SlotState slotState,
            Double longitude,
            Double latitude,
            String city,
            boolean needTitle
    ) {
        List<ChatMessage> recentMessages = contextService.getRecentMessages(sessionId);
        String contextPrompt = buildContextPrompt(content, slotState, recentMessages, longitude, latitude, city);

        int totalMsgCount = contextService.getMessageCount(sessionId);
        int nextId = totalMsgCount + 1;
        ChatMessage userMsg = new ChatMessage();
        userMsg.setMsgId(nextId);
        userMsg.setRole("user");
        userMsg.setContent(content);
        userMsg.setCreatedAt(LocalDateTime.now());

        contextService.updateContext(sessionId, slotState, userMsg, userMsg.getCreatedAt());

        TicketTools tools = createTicketTools(sessionId);
        ChatAssistant assistant = buildChatAssistant(sessionId, tools);

        StringBuilder fullText = new StringBuilder();
        int[] sentUpTo = {0};
        boolean[] metaFound = {false};

        CompletableFuture<Void> streamFuture = new CompletableFuture<>();

        TokenStream tokenStream = assistant.chat(sessionId, contextPrompt);
        tokenStream
            .onPartialResponse(token -> {
                if (metaFound[0]) return;

                fullText.append(token);
                String current = fullText.toString();

                int metaIdx = current.indexOf(META_DELIMITER);
                if (metaIdx != -1) {
                    metaFound[0] = true;
                    if (metaIdx > sentUpTo[0]) {
                        String toSend = current.substring(sentUpTo[0], metaIdx);
                        try {
                            sendSseEvent(emitter, SseEvent.message(toSend));
                        } catch (IOException e) {
                            log.error("[processDialogue] SSE 推送失败(meta前): {}", e.getMessage());
                        }
                    }
                    sentUpTo[0] = metaIdx;
                    return;
                }

                // 检查 buffer 末尾是否可能是分隔符的前缀（跨 token 边界）
                int safeEnd = current.length();
                for (int i = Math.max(sentUpTo[0], current.length() - META_DELIMITER.length()); i < current.length(); i++) {
                    String suffix = current.substring(i);
                    if (META_DELIMITER.startsWith(suffix)) {
                        safeEnd = i;
                        break;
                    }
                }

                if (safeEnd > sentUpTo[0]) {
                    String toSend = current.substring(sentUpTo[0], safeEnd);
                    try {
                        sendSseEvent(emitter, SseEvent.message(toSend));
                    } catch (IOException e) {
                        log.error("[processDialogue] SSE 推送失败(流式片段): {}", e.getMessage());
                    }
                }
                sentUpTo[0] = safeEnd;
            })
            .onCompleteResponse(response -> {
                try {
                    String full = fullText.toString();
                    String aiContent;
                    IntentEnum intent = IntentEnum.OTHER;
                    SlotState incomingSlots = new SlotState();

                    int metaIdx = full.indexOf(META_DELIMITER);
                    if (metaIdx != -1) {
                        aiContent = full.substring(0, metaIdx).trim();
                        int metaEnd = full.indexOf(META_DELIMITER, metaIdx + META_DELIMITER.length());
                        String metaJson = metaEnd != -1
                                ? full.substring(metaIdx + META_DELIMITER.length(), metaEnd).trim()
                                : full.substring(metaIdx + META_DELIMITER.length()).trim();
                        try {
                            JsonNode metaNode = objectMapper.readTree(metaJson);
                            if (metaNode.has("intent")) {
                                try {
                                    intent = IntentEnum.valueOf(metaNode.get("intent").asString());
                                } catch (IllegalArgumentException e) {
                                    log.warn("[processDialogue] 未知意图: {}", metaNode.get("intent").asString());
                                }
                            }
                            if (metaNode.has("slots") && !metaNode.get("slots").isNull()) {
                                incomingSlots = objectMapper.treeToValue(metaNode.get("slots"), SlotState.class);
                            }
                        } catch (Exception e) {
                            log.warn("[processDialogue] 元数据解析失败: {}", e.getMessage());
                        }
                    } else {
                        aiContent = full.trim();
                    }

                    if (!outputValidatorService.validate(aiContent)) {
                        sendSseEvent(emitter, SseEvent.error("50002", "AI 输出异常，请重试"));
                        emitter.complete();
                        streamFuture.complete(null);
                        return;
                    }

                    // 只推送最后一张卡片（跳步场景下中间卡片对用户无意义）
                    List<CardPayload> cards = tools.drainCards();
                    if (!cards.isEmpty()) {
                        CardPayload lastCard = cards.getLast();
                        log.info("[processDialogue] 推送卡片: {}", lastCard.getCardType());
                        sendSseEvent(emitter, SseEvent.card(lastCard.getCardType(), lastCard.getCardData()));
                    }

                    SlotState updatedSlotState = contextService.mergeSlots(slotState, incomingSlots);

                    // 标准化 movieName 类型字段（统一小写，用于模糊推荐匹配）
                    if (updatedSlotState.getMovieName() != null) {
                        updatedSlotState.setMovieName(updatedSlotState.getMovieName().trim());
                    }

                    int negateCount = updatedSlotState.getNegateCount() != null ? updatedSlotState.getNegateCount() : 0;
                    if (negateCount >= negateThreshold) {
                        String degradeMsg = "看来我的推荐不太对，让我了解得更准确一些——您更偏好哪种类型？预算大概多少？";
                        sendSseEvent(emitter, SseEvent.message(degradeMsg));
                        aiContent = aiContent + degradeMsg;
                    }

                    ChatMessage aiMsg = new ChatMessage();
                    aiMsg.setMsgId(nextId + 1);
                    aiMsg.setRole("assistant");
                    aiMsg.setContent(aiContent);
                    aiMsg.setIntent(intent.name());
                    aiMsg.setSlots(updatedSlotState);
                    aiMsg.setCreatedAt(LocalDateTime.now());
                    if (!cards.isEmpty()) {
                        aiMsg.setCardType(cards.getLast().getCardType());
                        aiMsg.setCardData(cards.getLast().getCardData());
                    }

                    contextService.updateContext(sessionId, updatedSlotState, aiMsg, aiMsg.getCreatedAt());

                    // 首条消息时由标题 Agent 生成标题（含降级逻辑）
                    String title = needTitle ? titleAgentService.generateTitle(content) : null;
                    if (title != null) {
                        chatSessionService.updateTitle(sessionId, title);
                    }

                    // 避免重复推送：只推送一次完成状态
                    sendSseEvent(emitter, SseEvent.done(sessionId,
                            intent.name(),
                            updatedSlotState,
                            title));
                    emitter.complete();
                    streamFuture.complete(null);
                } catch (Exception e) {
                    log.error("[processDialogue] onCompleteResponse 处理异常: {}", e.getMessage(), e);
                    try {
                        sendSseEvent(emitter, SseEvent.error("500", "处理异常，请重试"));
                    } catch (IOException ignored) {}
                    emitter.complete();
                    streamFuture.completeExceptionally(e);
                }
            })
            .onError(error -> {
                log.error("[processDialogue] LLM onError 回调异常: {}", error.getMessage(), error);
                try {
                    sendSseEvent(emitter, SseEvent.error("50001", "AI 响应超时，请重试"));
                    emitter.complete();
                } catch (IOException ignored) {}
                streamFuture.completeExceptionally(error);
            })
            .start();

        // 阻塞虚拟线程直到流式响应完成或超时
        try {
            streamFuture.get(sseTimeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.error("[processDialogue] streamFuture.get 超时", e);
            try {
                sendSseEvent(emitter, SseEvent.error("50001", "AI 响应超时，请重试"));
            } catch (IOException ignored) {}
            emitter.complete();
        } catch (ExecutionException e) {
            log.error("[processDialogue] streamFuture.get 执行异常: {}",
                    e.getCause() != null ? e.getCause().getMessage() : e.getMessage(), e);
            emitter.complete();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            emitter.complete();
        }
    }

    private String buildContextPrompt(
            String content,
            SlotState slotState,
            List<ChatMessage> recentMessages,
            Double longitude,
            Double latitude,
            String city
    ) {
        StringBuilder sb = new StringBuilder();
        if (!recentMessages.isEmpty()) {
            sb.append("【历史对话】\n");
            for (ChatMessage msg : recentMessages) {
                String role = msg.getRole();
                String text = msg.getContent();
                if (role != null && text != null) {
                    sb.append(role.equals("user") ? "用户" : "助手").append(": ").append(text).append("\n");
                }
            }
        }
        // 判断 slotState 是否有非 null 字段
        if (hasSlotData(slotState)) {
            sb.append("【当前槽位状态】\n");
            try {
                sb.append(objectMapper.writeValueAsString(slotState)).append("\n");
            } catch (Exception ignored) {}
        }
        // 注入用户位置信息
        if (longitude != null && latitude != null && longitude != 0 && latitude != 0) {
            sb.append("【用户位置】\n");
            sb.append("坐标：").append(longitude).append(",").append(latitude);
            if (city != null && !city.isBlank()) {
                sb.append("，城市：").append(city);
            }
            sb.append("\n");
        } else if (city != null && !city.isBlank()) {
            sb.append("【用户位置】\n城市：").append(city).append("\n");
        }
        sb.append("【用户输入】\n").append(content);
        return sb.toString();
    }

    private static boolean hasSlotData(SlotState slotState) {
        if (slotState == null) return false;
        return slotState.getMovieId() != null
                || slotState.getMovieName() != null
                || slotState.getCinemaId() != null
                || slotState.getCinemaName() != null
                || slotState.getHallId() != null
                || slotState.getHallType() != null
                || slotState.getHallName() != null
                || slotState.getTime() != null
                || slotState.getCount() != null
                || slotState.getSchedulesId() != null
                || slotState.getSeatIds() != null
                || slotState.getPriceMax() != null
                || slotState.getNegateCount() != null;
    }

    private void sendSseEvent(SseEmitter emitter, SseEvent event) throws IOException {
        emitter.send(SseEmitter.event()
                .name(event.getEvent())
                .data(event.getData())
                .reconnectTime(3000));
    }

    private void sendErrorAndComplete(SseEmitter emitter, ErrorCodeEnum code) {
        sendErrorAndComplete(emitter, code, code.getMessage());
    }

    private void sendErrorAndComplete(SseEmitter emitter, ErrorCodeEnum code, String message) {
        try {
            sendSseEvent(emitter, SseEvent.error(String.valueOf(code.getCode()), message));
            emitter.complete();
        } catch (IOException ignored) {}
    }
}
