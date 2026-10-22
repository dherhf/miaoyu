package org.dherhf.agent.config;

import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring AI 装配配置。
 * <p>
 * 模型（{@code ChatModel}）、{@code ChatClient.Builder} 由
 * {@code spring-ai-starter-model-openai} 依据 application.yml 中
 * {@code spring.ai.openai.*} 配置自动创建（DeepSeek 走 OpenAI 兼容协议）。
 * 本类只补充框架不会默认提供的会话记忆能力。
 * </p>
 */
@Configuration
public class AiConfig {

    /**
     * 聊天记忆：按 conversationId 隔离的滑动窗口记忆，窗口上限 10 条消息。
     * <p>
     * Spring AI 的 {@code ChatMemory} 以 conversationId 为键存储消息，
     * 与 LangChain4j 的 {@code ChatMemoryProvider}（按 memoryId 提供独立实例）
     * 语义等价：调用方通过 {@code MessageChatMemoryAdvisor} 的
     * {@code ChatMemory.CONVERSATION_ID} 参数传入 sessionId 即可实现多会话隔离。
     * </p>
     * <p>
     * {@code ChatMemoryAutoConfiguration} 仅在容器中不存在 {@code ChatMemory} Bean 时
     * 才会注册默认实现（默认窗口 20 条），此处显式声明以保留原窗口大小（10 条）。
     * </p>
     */
    @Bean
    public ChatMemory chatMemory() {
        return MessageWindowChatMemory.builder()
                .maxMessages(10)
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .build();
    }
}
