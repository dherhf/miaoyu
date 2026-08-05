package org.dherhf.agent.service;

import tools.jackson.databind.ObjectMapper;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.UserMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.enums.SessionStatusEnum;
import org.dherhf.agent.model.AgentResponse;
import org.dherhf.agent.model.card.CardPayload;
import org.dherhf.agent.model.sse.SseEvent;
import org.dherhf.agent.model.ticket.RequestContext;
import org.dherhf.agent.model.ticket.SlotState;
import org.dherhf.agent.tool.TicketServiceClient;
import org.dherhf.agent.tool.TicketTools;

import dev.langchain4j.model.chat.ChatModel;

/**
 * 对话引擎主流程服务。
 * <p>
 * 流程：用户输入 → 输入安全过滤 → 构造 LLM 请求（System Prompt + 上下文 + 历史） →
 * LangChain4j 调用 DeepSeek → 工具调用（自动跳步/缺槽追问/上下文修正） →
 * 输出校验 → SSE 流式推送 → MongoDB 持久化
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DialogueService {

    private final ChatModel chatModel;
    private final PromptService promptService;
    private final InputFilterService inputFilterService;
    private final OutputValidatorService outputValidatorService;
    private final ContextService contextService;
    private final ChatSessionService chatSessionService;
    private final TicketServiceClient ticketClient;
    private final IdempotentService idempotentService;
    private final ObjectMapper objectMapper;

    @Value("${agent.negate-threshold}")
    private int negateThreshold;

    @Value("${agent.sse-timeout-seconds}")
    private long sseTimeoutSeconds;

    /** LangChain4j AiService 接口，@MemoryId 绑定 sessionId 用于会话隔离。返回结构化响应由框架自动反序列化。 */
    public interface ChatAssistant {
        AgentResponse chat(@MemoryId String sessionId, @UserMessage String userMessage);
    }

    /**
     * 为每次请求构建独立的 AiServices 实例，绑定 sessionId 和 TicketTools。
     * 测试时可覆写此方法返回 mock。
     */
    protected ChatAssistant buildChatAssistant(String sessionId, TicketTools tools) {
        return AiServices.builder(ChatAssistant.class)
                .chatModel(chatModel)
                .tools(tools)
                .systemMessageProvider(memoryId -> promptService.getSystemPrompt())
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.builder()
                        .maxMessages(10)
                        .id(memoryId)
                        .build())
                .build();
    }

    private TicketTools createTicketTools(String sessionId) {
        return new TicketTools(ticketClient, objectMapper, contextService, idempotentService, sessionId);
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
     * @return SseEmitter
     */
    public SseEmitter handleMessage(
            String sessionId,
            Long userId,
            String content,
            Long scheduleId,
            List<Long> seatIds,
            Integer ticketCount,
            String requestId
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

        Thread.startVirtualThread(() -> {
            try {
                contextService.storeRequestContext(sessionId, requestCtx);
                processDialogue(emitter, sessionId, content, slotState);
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

    private void processDialogue(
            SseEmitter emitter,
            String sessionId,
            String content,
            SlotState slotState
    ) throws IOException {
        List<ChatMessage> recentMessages = contextService.getRecentMessages(sessionId);
        String contextPrompt = buildContextPrompt(content, slotState, recentMessages);

        int totalMsgCount = contextService.getMessageCount(sessionId);
        int nextId = totalMsgCount + 1;
        ChatMessage userMsg = new ChatMessage();
        userMsg.setMsgId(nextId);
        userMsg.setRole("user");
        userMsg.setContent(content);
        userMsg.setCreatedAt(LocalDateTime.now());

        contextService.updateContext(sessionId, slotState, userMsg, userMsg.getCreatedAt());

        // 每次请求构建独立的 TicketTools + ChatAssistant，通过 @MemoryId 绑定 sessionId
        TicketTools tools = createTicketTools(sessionId);
        ChatAssistant assistant = buildChatAssistant(sessionId, tools);

        AgentResponse response;
        try {
            response = assistant.chat(sessionId, contextPrompt);
        } catch (Exception ex) {
            log.error("[processDialogue] LLM 调用失败: {}", ex.getMessage(), ex);
            sendSseEvent(emitter, SseEvent.error("50001", "AI 响应超时，请重试"));
            emitter.complete();
            return;
        }

        String aiContent = response.content() != null ? response.content() : "";
        if (!outputValidatorService.validate(aiContent)) {
            sendSseEvent(emitter, SseEvent.error("50002", "AI 输出异常，请重试"));
            emitter.complete();
            return;
        }

        // 推送工具调用产生的卡片数据
        List<CardPayload> cards = tools.drainCards();
        log.info("[processDialogue] 推送卡片数量: {}, types: {}",
                cards.size(), cards.stream().map(CardPayload::getCardType).toList());
        for (CardPayload card : cards) {
            sendSseEvent(emitter, SseEvent.card(card.getCardType(), card.getCardData()));
        }

        if (!aiContent.isBlank()) {
            sendSseEvent(emitter, SseEvent.message(aiContent));
        }

        SlotState incomingSlots = response.slots() != null ? response.slots() : new SlotState();
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
        aiMsg.setIntent(response.intent() != null ? response.intent().name() : null);
        aiMsg.setSlots(updatedSlotState);
        aiMsg.setCreatedAt(LocalDateTime.now());
        if (!cards.isEmpty()) {
            aiMsg.setCardType(cards.getLast().getCardType());
            aiMsg.setCardData(cards.getLast().getCardData());
        }

        contextService.updateContext(sessionId, updatedSlotState, aiMsg, aiMsg.getCreatedAt());

        // 避免重复推送：只推送一次完成状态
        sendSseEvent(emitter, SseEvent.done(sessionId,
                response.intent() != null ? response.intent().name() : "",
                updatedSlotState));
        emitter.complete();
    }

    private String buildContextPrompt(
            String content,
            SlotState slotState,
            List<ChatMessage> recentMessages
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
