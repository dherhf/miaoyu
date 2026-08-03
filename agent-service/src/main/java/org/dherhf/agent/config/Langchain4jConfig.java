package org.dherhf.agent.config;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * LangChain4j ChatModel 配置。
 * <p>
 * 用 langchain4j-open-ai 提供的 OpenAI 兼容接口创建 ChatModel，解决启动期缺少 ChatModel Bean 的问题。
 * </p>
 */
@Configuration
public class Langchain4jConfig {

    @Value("${langchain4j.open-ai.chat-model.base-url}")
    private String baseUrl;

    @Value("${langchain4j.open-ai.chat-model.api-key}")
    private String apiKey;

    @Value("${langchain4j.open-ai.chat-model.model-name}")
    private String modelName;

    @Value("${langchain4j.open-ai.chat-model.temperature}")
    private double temperature;

    @Value("${langchain4j.open-ai.chat-model.max-tokens}")
    private int maxTokens;

    @Value("${langchain4j.open-ai.chat-model.timeout}")
    private String timeout;

    @Bean
    public ChatModel chatModel() {
        // langchain4j 的 timeout 通常以 Duration 表示；这里按配置字符串解析。
        // application.yml 中配置为 60s，因此按秒解析最稳妥。
        Duration timeoutDuration = parseDuration(timeout);

        return OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .timeout(timeoutDuration)
                .build();
    }

    private Duration parseDuration(String raw) {
        if (raw == null || raw.isBlank()) {
            return Duration.ofSeconds(60);
        }
        String s = raw.trim().toLowerCase();
        // 兼容 '60s'、'60'（默认秒）
        if (s.endsWith("s")) {
            long seconds = Long.parseLong(s.substring(0, s.length() - 1).trim());
            return Duration.ofSeconds(seconds);
        }
        long seconds = Long.parseLong(s);
        return Duration.ofSeconds(seconds);
    }
}