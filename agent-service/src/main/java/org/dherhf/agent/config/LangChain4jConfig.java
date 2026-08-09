package org.dherhf.agent.config;

import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * LangChain4j AiService 装配配置。
 * <p>
 * {@code @AiService} 接口由 Starter 自动扫描注册为 Bean，并在 AUTOMATIC 模式下自动装配：
 * <ul>
 *   <li>{@code StreamingChatModel} —— 由 application.yml 中
 *       {@code langchain4j.open-ai.streaming-chat-model.*} 自动创建</li>
 *   <li>{@code ChatMemoryProvider} —— 下方 {@code @Bean}，Starter 检测到唯一实例即注入</li>
 *   <li>所有含 {@code @Tool} 方法的 Bean（如 {@link org.dherhf.agent.tool.TicketTools}）</li>
 * </ul>
 * 注意：{@code LangChain4jAutoConfiguration} 不会注册默认 {@code ChatMemoryProvider}，
 * 若不提供此 Bean 则 @AiService 无记忆能力；若提供多个则 AUTOMATIC 模式报冲突。
 * </p>
 */
@Configuration
public class LangChain4jConfig {

    /**
     * 聊天记忆提供者：每个 sessionId（即 @MemoryId）对应独立的 MessageWindowChatMemory，
     * 窗口上限 10 条消息。
     * <p>
     * 与原 {@code AiServices.builder().chatMemoryProvider(memoryId -> ...)} 行为完全等价。
     * </p>
     * <p>
     * <b>为何返回 {@code ChatMemoryProvider} 而非 {@code ChatMemory}：</b>
     * 若注册 {@code ChatMemory} Bean，Starter 会以单例共享内存装配（所有会话共用一份记忆），
     * 破坏多会话隔离；{@code ChatMemoryProvider} 按 memoryId 提供独立实例，才是正确语义。
     * </p>
     */
    @Bean
    public ChatMemoryProvider chatMemoryProvider() {
        return memoryId -> MessageWindowChatMemory.builder()
                .maxMessages(10)
                .id(memoryId)
                .build();
    }
}
