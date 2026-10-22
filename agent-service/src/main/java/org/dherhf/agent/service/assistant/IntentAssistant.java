package org.dherhf.agent.service.assistant;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/**
 * 意图识别 Agent —— 基于 Spring AI {@link ChatClient} 的无状态单次调用。
 * <p>
 * 不装配 {@code ChatMemoryAdvisor}：意图识别每次只依赖当前消息 + 预构建的系统提示词。
 * </p>
 * <p>
 * 系统提示词含 {@link org.dherhf.agent.enums.IntentEnum#toPromptList()} 运行时拼接，
 * 非编译期常量，因此由调用方传入，每次通过 {@code .system(...)} 设置。
 * </p>
 */
@Component
public class IntentAssistant {

    private final ChatClient chatClient;

    public IntentAssistant(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.clone().build();
    }

    public String recognizeIntent(String userMessage, String systemPrompt) {
        return chatClient.prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call()
                .content();
    }
}
