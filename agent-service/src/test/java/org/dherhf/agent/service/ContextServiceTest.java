package org.dherhf.agent.service;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.dherhf.agent.common.TestConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.extension.ExtendWith;
import org.bson.Document;
import java.time.Duration;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContextService 上下文管理服务测试")
class ContextServiceTest {
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    private final ObjectMapper objectMapper = new JsonMapper();
    private ContextService contextService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        contextService = new ContextService(redisTemplate, mongoTemplate, objectMapper);
        ReflectionTestUtils.setField(contextService, "ttlSeconds", 86400L);
        ReflectionTestUtils.setField(contextService, "historyWindow", TestConstants.HISTORY_MSG_WINDOW);
    }

    @Nested
    @DisplayName("loadSlotState 加载槽位缓存")
    class LoadSlotStateTest {
        @Test
        @DisplayName("Redis命中直接返回，不查Mongo")
        void redisHitSkipMongo() throws Exception {
            Map<String, Object> slot = Map.of("film", Map.of("movieId", 1));
            String json = objectMapper.writeValueAsString(slot);
            when(valueOperations.get(TestConstants.CONTEXT_REDIS_PREFIX + TestConstants.SESSION_ID)).thenReturn(json);
            Map<String, Object> res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res).isEqualTo(slot);
            verifyNoInteractions(mongoTemplate);
        }

        @Test
        @DisplayName("Redis空，查Mongo并回填Redis")
        void redisMissFallbackMongo() throws Exception {
            when(valueOperations.get(anyString())).thenReturn(null);
            Document mongoDoc = new Document("slotState", Map.of("cinema", Map.of("cinemaId", 2L)));
            when(mongoTemplate.findOne(any(Query.class), eq(Document.class), eq("chat_sessions"))).thenReturn(mongoDoc);
            Map<String, Object> res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res).containsKey("cinema");
            verify(valueOperations).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Redis JSON损坏，降级Mongo")
        void redisJsonErrorFallbackMongo() {
            when(valueOperations.get(anyString())).thenReturn("{bad json}");
            Document mongoDoc = new Document("slotState", Map.of("film", "流浪地球"));
            when(mongoTemplate.findOne(any(Query.class), eq(Document.class), eq("chat_sessions"))).thenReturn(mongoDoc);
            Map<String, Object> res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res).containsEntry("film", "流浪地球");
        }

        @Test
        @DisplayName("Redis、Mongo均无数据返回空Map")
        void allMissReturnEmpty() {
            when(valueOperations.get(anyString())).thenReturn(null);
            when(mongoTemplate.findOne(any(), eq(Document.class), eq("chat_sessions"))).thenReturn(null);
            assertThat(contextService.loadSlotState(TestConstants.SESSION_ID)).isEmpty();
        }
    }

    @Nested
    @DisplayName("mergeSlots 槽位合并逻辑")
    class MergeSlotsTest {
        @ParameterizedTest
        @CsvSource(delimiter = '|', value = {
                "{\"film\":{\"id\":1}}|{\"cinema\":{\"id\":2}}|film,cinema",
                "{\"film\":{\"id\":1}}|{\"film\":{\"name\":\"test\"}}|film（嵌套合并）",
                "{\"film\":\"A\"}|{\"film\":\"\",\"cinema\":null}|film"
        })
        @DisplayName("多场景槽位合并")
        void mergeMultiCase(String oldJson, String newJson, String expectKey) throws Exception {
            Map<String, Object> old = objectMapper.readValue(oldJson, Map.class);
            Map<String, Object> incoming = objectMapper.readValue(newJson, Map.class);
            Map<String, Object> merged = contextService.mergeSlots(old, incoming);
            for (String key : expectKey.split("（")[0].split(",")) {
                assertThat(merged).containsKey(key.trim());
            }
        }

        @Test
        @DisplayName("negate_slot清空槽位，negateCount自增")
        void handleNegateSlot() {
            Map<String, Object> old = new HashMap<>(Map.of("film", "test", "negateCount", 1));
            Map<String, Object> incoming = Map.of("negate_slot", "film");
            Map<String, Object> merged = contextService.mergeSlots(old, incoming);
            assertThat(merged).doesNotContainKey("film");
            assertThat(merged.get("negateCount")).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("clearContext 清理缓存")
    class ClearContextTest {
        @Test
        @DisplayName("删除Redis对应key")
        void deleteRedisKey() {
            contextService.clearContext(TestConstants.SESSION_ID);
            verify(redisTemplate).delete(TestConstants.CONTEXT_REDIS_PREFIX + TestConstants.SESSION_ID);
        }
    }
}
