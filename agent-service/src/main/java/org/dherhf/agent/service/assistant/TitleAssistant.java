package org.dherhf.agent.service.assistant;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/**
 * 标题生成 Agent —— 基于 Spring AI {@link ChatClient} 的无状态单次调用。
 * <p>
 * 不装配 {@code ChatMemoryAdvisor}：标题生成是无状态单次调用。
 * </p>
 */
@Component
public class TitleAssistant {

    private static final String SYSTEM_PROMPT = """
            你是妙语购票的对话标题助手。根据用户的第一条消息，生成一个不超过 20 字的中文标题，概括其核心需求。
            只输出标题本身，不要任何解释、引号或标点符号。
            示例：用户说"我想买两张流浪地球3的票" → 输出"购买流浪地球3电影票"
            示例：用户说"查一下我的订单" → 输出"查询订单"
            """;

    private final ChatClient chatClient;

    public TitleAssistant(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.clone().build();
    }

    public String generateTitle(String userMessage) {
        return chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(userMessage)
                .call()
                .content();
    }
}
