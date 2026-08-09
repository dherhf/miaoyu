package org.dherhf.agent.service.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.service.assistant.TitleAssistant;
import org.springframework.stereotype.Service;

/**
 * 标题生成服务（独立于主对话流程）。
 * <p>
 * 委托 {@link TitleAssistant}（声明式 {@code @AiService}）调用 LLM 生成 ≤20 字标题，
 * 生成失败时降级为截断用户输入前 20 字符。
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TitleService {

    private final TitleAssistant titleAssistant;

    /**
     * 生成对话标题。失败时降级为截断用户输入前 20 字符。
     *
     * @param content 用户首条消息
     * @return 生成的标题
     */
    public String generateTitle(String content) {
        String title = null;
        try {
            title = titleAssistant.generateTitle(content);
        } catch (Exception e) {
            log.warn("标题生成失败，降级截断: {}", e.getMessage());
        }
        // ai生成成功,格式化
        if (title != null) {
            title = title.replaceAll("\\s+", " ").trim();
            if (title.length() > 20) {
                title = title.substring(0, 20) + "...";
            }
        }
        // ai 生成失败,使用原文降级
        if (title == null || title.isBlank()) {
            String trimmed = content.replaceAll("\\s+", " ").trim();
            title = trimmed.length() > 20 ? trimmed.substring(0, 20) + "..." : trimmed;
        }
        return title;
    }
}
