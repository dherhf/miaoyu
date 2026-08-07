package org.dherhf.agent.service;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.UserMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 标题生成 Agent（独立于主对话流程）。
 * <p>
 * 使用非流式 {@link ChatModel}，根据用户首条消息生成 ≤20 字的中文标题。
 * 生成失败时降级为截断用户输入前 20 字符。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TitleAgentService {

    private final ChatModel chatModel;

    /** LangChain4j AiService 接口，返回简短标题文本。 */
    public interface TitleAssistant {
        String generateTitle(@UserMessage String userMessage);
    }

    private static final String TITLE_PROMPT = """
            你是妙语购票的对话标题助手。根据用户的第一条消息，生成一个不超过 20 字的中文标题，概括其核心需求。
            只输出标题本身，不要任何解释、引号或标点符号。
            示例：用户说"我想买两张流浪地球3的票" → 输出"购买流浪地球3电影票"
            示例：用户说"查一下我的订单" → 输出"查询订单"
            """;

    /**
     * 生成对话标题。失败时降级为截断用户输入前 20 字符。
     *
     * @param content 用户首条消息
     * @return 生成的标题
     */
    public String generateTitle(String content) {
        String title;
        try {
            TitleAssistant assistant = AiServices.builder(TitleAssistant.class)
                    .chatModel(chatModel)
                    .systemMessageProvider(memoryId -> TITLE_PROMPT)
                    .build();
            title = assistant.generateTitle(content);
            if (title != null) {
                title = title.replaceAll("\\s+", " ").trim();
                if (title.length() > 20) {
                    title = title.substring(0, 20) + "...";
                }
            }
        } catch (Exception e) {
            log.warn("[generateTitle] 标题生成失败，降级截断: {}", e.getMessage());
            title = null;
        }
        if (title == null || title.isBlank()) {
            String trimmed = content.replaceAll("\\s+", " ").trim();
            title = trimmed.length() > 20 ? trimmed.substring(0, 20) + "..." : trimmed;
        }
        return title;
    }
}
