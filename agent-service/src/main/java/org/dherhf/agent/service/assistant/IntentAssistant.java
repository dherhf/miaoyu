package org.dherhf.agent.service.assistant;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.spring.AiService;
import dev.langchain4j.service.spring.AiServiceWiringMode;

/**
 * 意图识别 Agent —— 声明式 AiService，使用非流式 ChatModel。
 * <p>
 * {@code wiringMode = EXPLICIT} 仅装配 {@code chatModel}，
 * 不引入 ChatMemoryProvider（意图识别是无状态单次调用）。
 * </p>
 * <p>
 * 系统提示词含 {@link org.dherhf.agent.enums.IntentEnum#toPromptList()} 运行时拼接，
 * 非编译期常量，无法用静态 {@code @SystemMessage} 文本。
 * 采用 {@code @SystemMessage("{{systemPrompt}}")} + {@code @V} 透传，
 * 调用方传入预构建的提示词（与 {@link ChatAssistant} 动态提示词方案一致）。
 * </p>
 */
@AiService(wiringMode = AiServiceWiringMode.EXPLICIT, chatModel = "openAiChatModel")
public interface IntentAssistant {

    @SystemMessage("{{systemPrompt}}")
    String recognizeIntent(
            @UserMessage String userMessage,
            @V("systemPrompt") String systemPrompt
    );
}
