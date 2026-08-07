package org.dherhf.agent.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@DisplayName("PromptService 系统提示词测试")
class PromptServiceTest {
    private final PromptService promptService = new PromptService();

    @Test
    @DisplayName("提示词包含全部核心规则字段，长度合法")
    void promptContainsAllCore() {
        String prompt = promptService.getSystemPrompt();
        assertThat(prompt).isNotBlank();
        assertThat(prompt.length()).isGreaterThan(500);
        assertThat(prompt).contains("购票助手", "BUY_TICKET", "movieName", "negateSlot", "searchMovies");
    }

    @Test
    @DisplayName("提示词包含当日日期，确保 LLM 正确解析相对时间")
    void promptContainsCurrentDate() {
        String prompt = promptService.getSystemPrompt();
        String todayText = "今天是 " + LocalDate.now().format(
                DateTimeFormatter.ofPattern("yyyy-MM-dd", java.util.Locale.ROOT));
        assertThat(prompt).contains(todayText);
    }
}
