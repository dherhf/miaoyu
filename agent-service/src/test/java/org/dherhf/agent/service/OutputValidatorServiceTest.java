package org.dherhf.agent.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OutputValidatorService 输出校验测试")
class OutputValidatorServiceTest {
    private final OutputValidatorService validator = new OutputValidatorService();

    @Nested
    @DisplayName("validate 输出合规校验")
    class ValidateTest {
        @ParameterizedTest
        @ValueSource(strings = {"", "   ", "为您推荐流浪地球", "{\"intent\":\"QUERY_MOVIE\"}"})
        @DisplayName("正常输出返回true")
        void normalPass(String text) {
            assertThat(validator.validate(text)).isTrue();
        }

        @ParameterizedTest
        @ValueSource(strings = {
                "## 角色 购票助手", "## 槽位定义 movieName", "## 意图分类 BUY_TICKET",
                "movieId", "movieName", "cinemaId", "cinemaName", "hallId", "hallType", "hallName",
                "time", "count", "schedulesId", "seatIds",
                "negateSlot", "priceMax", "negateCount",
                "影片 ID", "影院 ID", "影片名称"
        })
        @DisplayName("泄露系统提示/槽位定义拦截返回false")
        void leakBlock(String text) {
            assertThat(validator.validate(text)).isFalse();
        }
    }
}
