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

import org.dherhf.agent.common.ErrorCodeEnum;
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
                processDialogue(emitter, sessionId, userId, content, slotState);
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
            Long userId,
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
        contextService.updateContext(sessionId, slotState, userMsg, userMsg.getCreatedAt());

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

        Object negateCount = mergedSlots.get("negateCount");
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
        aiMsg.setSlots(mergedSlots);
        aiMsg.setCreatedAt(LocalDateTime.now());
        contextService.updateContext(sessionId, mergedSlots, aiMsg, aiMsg.getCreatedAt());

        sendSseEvent(emitter, SseEvent.done(sessionId,
                parsed.intent != null ? parsed.intent.name() : "",
                mergedSlots));
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
                    try {
                        pr.intent = IntentEnum.valueOf(intentObj.toString());
                    } catch (IllegalArgumentException ignored) {}
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
