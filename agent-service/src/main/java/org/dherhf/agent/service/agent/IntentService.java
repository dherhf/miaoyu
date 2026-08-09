package org.dherhf.agent.service.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.enums.IntentEnum;
import org.dherhf.agent.service.assistant.IntentAssistant;
import org.springframework.stereotype.Service;

/**
 * 意图识别服务（独立于主对话流程）。
 * <p>
 * 委托 {@link IntentAssistant}（声明式 {@code @AiService}）调用 LLM 识别意图，
 * 识别失败时降级返回 {@link IntentEnum#OTHER}。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IntentService {

    private final IntentAssistant intentAssistant;

    private static final String INTENT_PROMPT = """
            你是妙语购票的意图识别助手。根据用户当前消息，判断用户的意图。
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
     * @param content 用户当前消息
     * @return 意图枚举名（如 "BUY_TICKET"）
     */
    public String recognizeIntent(String content) {
        try {
            String result = intentAssistant.recognizeIntent(content, INTENT_PROMPT);
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
