package org.dherhf.agent.service;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.UserMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.enums.IntentEnum;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 意图识别 Agent（独立于主对话流程）。
 * <p>
 * 使用非流式 {@link ChatModel}，根据用户消息 + 历史对话识别意图。
 * 识别失败时降级返回 {@link IntentEnum#OTHER}。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IntentRecognitionService {

    private final ChatModel chatModel;

    /** LangChain4j AiService 接口，返回意图枚举名。 */
    public interface IntentAssistant {
        String recognizeIntent(@UserMessage String userMessage);
    }

    private static final String INTENT_PROMPT = """
            你是妙语购票的意图识别助手。根据用户消息和历史对话，判断用户的意图。
            只输出意图枚举名，不要任何解释或标点。

            可选意图：
            """ + IntentEnum.toPromptList() + """

            注意：用户说"换一个"、"太贵了"等对已推荐结果表达不满时，意图为 MODIFY。
            用户说"查一下我的订单"时，意图为 QUERY_ORDER。
            用户说"怎么去"、"附近有什么"时，意图为 TRIP_PLAN。
            """;

    /**
     * 识别用户意图。失败时降级返回 OTHER。
     *
     * @param content         用户当前消息
     * @param recentMessages  最近历史对话
     * @return 意图枚举名（如 "BUY_TICKET"）
     */
    public String recognizeIntent(String content, List<ChatMessage> recentMessages) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append(ChatMessage.formatHistory(recentMessages));
            sb.append("【用户输入】\n").append(content);

            IntentAssistant assistant = AiServices.builder(IntentAssistant.class)
                    .chatModel(chatModel)
                    .systemMessageProvider(memoryId -> INTENT_PROMPT)
                    .build();
            String result = assistant.recognizeIntent(sb.toString());
            if (result != null) {
                result = result.trim();
                try {
                    IntentEnum.valueOf(result);
                    return result;
                } catch (IllegalArgumentException e) {
                    log.warn("[recognizeIntent] 未知意图值: {}", result);
                }
            }
        } catch (Exception e) {
            log.warn("[recognizeIntent] 意图识别失败，降级 OTHER: {}", e.getMessage());
        }
        return IntentEnum.OTHER.name();
    }
}
