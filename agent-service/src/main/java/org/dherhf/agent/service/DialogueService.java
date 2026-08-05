package org.dherhf.agent.service;

import tools.jackson.databind.ObjectMapper;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.enums.IntentEnum;
import org.dherhf.agent.enums.SessionStatusEnum;
import org.dherhf.agent.model.sse.SseEvent;
import org.dherhf.agent.tool.TicketTools;

import dev.langchain4j.model.chat.ChatModel;

/**
 * 对话引擎主流程服务（对应系分 §3.9.1 - 对话消息处理全链路）。
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
    private final TicketTools ticketTools;
    private final ObjectMapper objectMapper;

    @Value("${agent.negate-threshold}")
    private int negateThreshold;

    @Value("${agent.sse-timeout-seconds}")
    private long sseTimeoutSeconds;

    /** LangChain4j AiService 接口，运行时由 AiServices 构建 */
    public interface ChatAssistant {
        String chat(@dev.langchain4j.service.UserMessage String userMessage);
    }

    private ChatAssistant chatAssistant;

    @PostConstruct
    public void init() {
        chatAssistant = AiServices.builder(ChatAssistant.class)
                .chatModel(chatModel)
                .tools(ticketTools)
                .systemMessageProvider(chatMemoryId -> promptService.getSystemPrompt())
                .build();
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
     * @return SseEmitter
     */
    public SseEmitter handleMessage(
            String sessionId,
            Long userId,
            String content,
            Long scheduleId,
            List<Long> seatIds,
            Integer ticketCount
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

        Map<String, Object> slotState = contextService.loadSlotState(sessionId);

        // P0 修复：setContext 必须在虚拟线程内调用，ThreadLocal 不跨线程继承
        Thread.startVirtualThread(() -> {
            try {
                TicketTools.setContext(userId, scheduleId, seatIds, ticketCount);
                processDialogue(emitter, sessionId, content, slotState);
            } catch (Exception ex) {
                log.error("[handleMessage] 对话处理异常: sessionId={}", sessionId, ex);
                try {
                    sendSseEvent(emitter, SseEvent.error("500", "服务异常，请重试"));
                } catch (IOException ignored) {}
                emitter.completeWithError(ex);
            } finally {
                TicketTools.clearContext();
            }
        });

        return emitter;
    }

    private void processDialogue(
            SseEmitter emitter,
            String sessionId,
            String content,
            Map<String, Object> slotState
    ) throws IOException {
        List<Map<String, Object>> recentMessages = contextService.getRecentMessages(sessionId);
        String contextPrompt = buildContextPrompt(content, slotState, recentMessages);

        // P2-a 修复：msgId 基于全量消息数，而非 historyWindow 截断后的 recentMessages
        int totalMsgCount = contextService.getMessageCount(sessionId);
        int nextId = totalMsgCount + 1;
        ChatMessage userMsg = new ChatMessage();
        userMsg.setMsgId(nextId);
        userMsg.setRole("user");
        userMsg.setContent(content);
        userMsg.setCreatedAt(LocalDateTime.now());

        // 创建一个不包含createdAt的map来避免序列化问题
        Map<String, Object> userMsgMap = new HashMap<>();
        userMsgMap.put("msgId", userMsg.getMsgId());
        userMsgMap.put("role", userMsg.getRole());
        userMsgMap.put("content", userMsg.getContent());
        // 不添加createdAt，让MongoDB自动处理

        contextService.updateContext(sessionId, slotState, userMsgMap, userMsg.getCreatedAt());

        String aiResponse;
        try {
            aiResponse = chatAssistant.chat(contextPrompt);
        } catch (Exception ex) {
            log.error("[processDialogue] LLM 调用失败: {}", ex.getMessage(), ex);
            sendSseEvent(emitter, SseEvent.error("50001", "AI 响应超时，请重试"));
            emitter.complete();
            return;
        }

        if (!outputValidatorService.validate(aiResponse)) {
            sendSseEvent(emitter, SseEvent.error("50002", "AI 输出异常，请重试"));
            emitter.complete();
            return;
        }

        ParsedResponse parsed = parseResponse(aiResponse);

        // P1-c 修复：推送工具调用产生的卡片数据
        List<org.dherhf.agent.model.card.CardPayload> cards = TicketTools.drainCards();
        for (org.dherhf.agent.model.card.CardPayload card : cards) {
            sendSseEvent(emitter, SseEvent.card(card.getCardType(), card.getCardData()));
        }

        if (parsed.content != null && !parsed.content.isBlank()) {
            sendSseEvent(emitter, SseEvent.message(parsed.content));
        }

        Map<String, Object> mergedSlots = contextService.mergeSlots(slotState, parsed.slots);

        // P0 修复：确保工具调用后槽位状态正确更新（特别处理 film 和 cinema 槽位）
        Map<String, Object> updatedSlotState = new HashMap<>(mergedSlots);

        // 为了更好的槽位状态管理，如果解析的 slots 中包含电影或影院信息，需要特别处理
        if (parsed.slots != null) {
            // 处理电影信息
            if (parsed.slots.containsKey("film") && parsed.slots.get("film") instanceof Map<?, ?> filmMap) {
                @SuppressWarnings("unchecked")
                Map<String, Object> filmData = (Map<String, Object>) parsed.slots.get("film");
                if (filmData != null && !filmData.isEmpty()) {
                    // 如果当前 slotState 中没有 film 信息，则设置它
                    if (!updatedSlotState.containsKey("film")) {
                        updatedSlotState.put("film", new HashMap<>());
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, Object> existingFilm = (Map<String, Object>) updatedSlotState.get("film");
                    existingFilm.putAll(filmData);
                }
            }

            // 处理影院信息
            if (parsed.slots.containsKey("cinema") && parsed.slots.get("cinema") instanceof Map<?, ?> cinemaMap) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cinemaData = (Map<String, Object>) parsed.slots.get("cinema");
                if (cinemaData != null && !cinemaData.isEmpty()) {
                    // 如果当前 slotState 中没有 cinema 信息，则设置它
                    if (!updatedSlotState.containsKey("cinema")) {
                        updatedSlotState.put("cinema", new HashMap<>());
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, Object> existingCinema = (Map<String, Object>) updatedSlotState.get("cinema");
                    existingCinema.putAll(cinemaData);
                }
            }
        }

        // 修复类型参数的处理一致性
        if (parsed.slots != null && parsed.slots.containsKey("film")) {
            Object filmObj = parsed.slots.get("film");
            if (filmObj instanceof Map<?, ?> filmMap) {
                @SuppressWarnings("unchecked")
                Map<String, Object> filmData = (Map<String, Object>) filmMap;
                // 检查是否有类型字段并进行标准化处理
                if (filmData.containsKey("type")) {
                    Object typeObj = filmData.get("type");
                    if (typeObj != null && typeObj instanceof String typeStr) {
                        // 标准化类型，避免大小写敏感问题
                        filmData.put("type", typeStr.trim().toLowerCase());
                    }
                }
            }
        }

        Object negateCount = updatedSlotState.get("negateCount");
        if (negateCount instanceof Number n && n.intValue() >= negateThreshold) {
            String degradeMsg = "看来我的推荐不太对，让我了解得更准确一些——您更偏好哪种类型？预算大概多少？";
            sendSseEvent(emitter, SseEvent.message(degradeMsg));
            parsed.content = (parsed.content == null ? "" : parsed.content) + degradeMsg;
        }

        ChatMessage aiMsg = new ChatMessage();
        aiMsg.setMsgId(nextId + 1);
        aiMsg.setRole("assistant");
        aiMsg.setContent(parsed.content);
        aiMsg.setIntent(parsed.intent != null ? parsed.intent.name() : null);
        aiMsg.setSlots(updatedSlotState);
        aiMsg.setCreatedAt(LocalDateTime.now());

        // 创建一个不包含createdAt的map来避免序列化问题
        Map<String, Object> aiMsgMap = new HashMap<>();
        aiMsgMap.put("msgId", aiMsg.getMsgId());
        aiMsgMap.put("role", aiMsg.getRole());
        aiMsgMap.put("content", aiMsg.getContent());
        aiMsgMap.put("cardType", aiMsg.getCardType());
        aiMsgMap.put("cardData", aiMsg.getCardData());
        aiMsgMap.put("intent", aiMsg.getIntent());
        aiMsgMap.put("slots", aiMsg.getSlots());
        // 不添加createdAt，让MongoDB自动处理

        contextService.updateContext(sessionId, updatedSlotState, aiMsgMap, aiMsg.getCreatedAt());

        // 避免重复推送：只推送一次完成状态
        sendSseEvent(emitter, SseEvent.done(sessionId,
                parsed.intent != null ? parsed.intent.name() : "",
                updatedSlotState));  // 使用 updatedSlotState 而不是 mergedSlots
        emitter.complete();
    }

    private String buildContextPrompt(
            String content,
            Map<String, Object> slotState,
            List<Map<String, Object>> recentMessages
    ) {
        StringBuilder sb = new StringBuilder();
        if (!recentMessages.isEmpty()) {
            sb.append("【历史对话】\n");
            for (Map<String, Object> msg : recentMessages) {
                String role = (String) msg.get("role");
                String text = (String) msg.get("content");
                if (role != null && text != null) {
                    sb.append(role.equals("user") ? "用户" : "助手").append(": ").append(text).append("\n");
                }
            }
        }
        if (!slotState.isEmpty()) {
            sb.append("【当前槽位状态】\n");
            try {
                sb.append(objectMapper.writeValueAsString(slotState)).append("\n");
            } catch (Exception ignored) {}
        }
        sb.append("【用户输入】\n").append(content);
        return sb.toString();
    }

    private ParsedResponse parseResponse(String aiResponse) {
        ParsedResponse pr = new ParsedResponse();
        pr.content = aiResponse;

        String json = extractJson(aiResponse);
        if (json != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = objectMapper.readValue(json, Map.class);
                Object intentObj = map.get("intent");
                if (intentObj != null) {
                    pr.intent = IntentEnum.parseSafe(intentObj.toString());
                }
                Object contentObj = map.get("content");
                if (contentObj instanceof String s && !s.isBlank()) {
                    pr.content = s;
                }
                Object slotsObj = map.get("slots");
                if (slotsObj instanceof Map<?, ?> sm) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> slotsMap = (Map<String, Object>) sm;
                    pr.slots = slotsMap;
                }
            } catch (Exception ex) {
                log.debug("[parseResponse] JSON 解析失败，按纯文本处理: {}", ex.getMessage());
            }
        }

        if (pr.slots == null) {
            pr.slots = new HashMap<>();
        }
        return pr;
    }

    private String extractJson(String text) {
        if (text == null) {
            return null;
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return null;
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

    private static class ParsedResponse {
        String content;
        IntentEnum intent;
        Map<String, Object> slots;
    }
}
