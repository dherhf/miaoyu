package org.dherhf.agent.service;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;
import reactor.core.publisher.Flux;

/**
 * 对话主 Agent —— 基于 LangChain4j Spring Boot Starter 的声明式 AiService。
 * <p>
 * {@code @AiService} 替代 {@code AiServices.builder()} 手动构建：模型、工具、
 * 聊天记忆均由 Spring 容器自动装配（见 {@link org.dherhf.agent.config.LangChain4jConfig}
 * 与 application.yml），无需手写实现类。
 * </p>
 *
 * <h3>系统提示词为何用 {@code @SystemMessage("{{systemPrompt}}")} + {@code @V}</h3>
 * 本项目系统提示词由 {@link PromptService#getSystemPrompt()} 运行时动态生成
 * （含当日日期、槽位定义），不适用静态 {@code @SystemMessage} 文本。
 * <p>
 * 经源码确认 {@code langchain4j-spring-boot4-starter} 1.18.1 的 {@code AiServiceFactory}
 * 未暴露 {@code systemMessageProvider} 装配（无对应字段/setter），因此无法通过注册
 * {@code SystemMessageProvider} Bean 实现动态提示词。此处采用模板透传方案：
 * 调用方传入 {@code promptService.getSystemPrompt()}，{@code @V} 参数对 LLM 不可见，
 * PromptService 仍是提示词唯一来源。
 * </p>
 */
@AiService
public interface ChatAssistant {

    /**
     * 流式对话。
     * <ul>
     *   <li>{@code @MemoryId sessionId} —— 绑定到 {@link dev.langchain4j.memory.chat.ChatMemoryProvider}
     *       实现每会话独立消息窗口；同时经 {@code @ToolMemoryId} 自动注入到
     *       {@link org.dherhf.agent.tool.TicketTools} 工具方法参数，实现单例工具的会话级状态隔离。</li>
     *   <li>{@code @UserMessage userMessage} —— 本轮上下文提示词（含历史/槽位/位置/意图）。</li>
     *   <li>{@code @V("systemPrompt")} —— 透传动态系统提示词（LLM 不可见，仅用于模板解析）。</li>
     * </ul>
     *
     * @return Flux&lt;String&gt; 逐 token 流式输出（langchain4j-reactor 自动桥接 StreamingChatModel → Flux）
     */
    @SystemMessage("{{systemPrompt}}")
    Flux<String> chat(
            @MemoryId String sessionId,
            @UserMessage String userMessage,
            @V("systemPrompt") String systemPrompt
    );
}
