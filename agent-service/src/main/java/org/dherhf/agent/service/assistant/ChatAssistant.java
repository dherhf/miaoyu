package org.dherhf.agent.service.assistant;

import org.dherhf.agent.tool.TicketTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.Map;

/**
 * 对话主 Agent —— 基于 Spring AI {@link ChatClient} 的声明式调用封装。
 * <p>
 * 与原 LangChain4j {@code @AiService} 的职责一致：模型、工具、聊天记忆统一装配。
 * <ul>
 *   <li>{@code ChatModel} —— 由 {@code spring-ai-starter-model-openai} 依据
 *       {@code spring.ai.openai.*} 自动创建（DeepSeek 兼容 OpenAI 协议）</li>
 *   <li>{@code ChatMemory} —— 见 {@link org.dherhf.agent.config.AiConfig}，
 *       按 {@code ChatMemory.CONVERSATION_ID} 实现每会话独立消息窗口</li>
 *   <li>工具 —— 含 {@code @Tool} 方法的 {@link TicketTools}，通过 {@code .tools()} 显式注册</li>
 * </ul>
 * </p>
 *
 * <h3>动态系统提示词</h3>
 * 系统提示词由 {@link org.dherhf.agent.service.PromptService#getSystemPrompt()}
 * 运行时生成（含当日日期、槽位定义），每次调用通过 {@code .system(...)} 传入，
 * {@link org.dherhf.agent.service.PromptService} 仍是提示词唯一来源。
 *
 * <h3>会话级工具状态</h3>
 * LangChain4j 的 {@code @ToolMemoryId} 在 Spring AI 中对应 {@code ToolContext}：
 * 通过 {@code .toolContext(Map.of(TicketTools.TOOL_CONTEXT_SESSION_ID, sessionId))}
 * 传入，工具方法声明 {@code ToolContext} 参数即可读取，对 LLM 不可见，不影响函数 schema。
 */
@Component
public class ChatAssistant {

    private final ChatClient chatClient;
    private final TicketTools ticketTools;

    public ChatAssistant(ChatClient.Builder chatClientBuilder,
                         ChatMemory chatMemory,
                         TicketTools ticketTools) {
        // 每个 Assistant 持有独立 ChatClient，避免共享 Builder 的默认配置互相污染
        this.chatClient = chatClientBuilder.clone()
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
        this.ticketTools = ticketTools;
    }

    /**
     * 流式对话。
     *
     * @param sessionId    会话 ID（同时作为 ChatMemory 的 conversationId 与工具的会话上下文）
     * @param userMessage  本轮上下文提示词（含历史以外的槽位/位置/意图）
     * @param systemPrompt 动态系统提示词
     * @return 逐 token 流式输出
     */
    public Flux<String> chat(String sessionId, String userMessage, String systemPrompt) {
        return chatClient.prompt()
                .system(systemPrompt)
                .user(userMessage)
                .tools(ticketTools)
                .toolContext(Map.of(TicketTools.TOOL_CONTEXT_SESSION_ID, sessionId))
                .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, sessionId))
                .stream()
                .content();
    }
}
