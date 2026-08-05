package org.dherhf.agent.service;

import tools.jackson.databind.ObjectMapper;
import org.dherhf.agent.common.TestConstants;
import org.dherhf.agent.model.ticket.SlotState;
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
import org.dherhf.agent.repository.ChatMessageRepository;
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
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private ValueOperations<String, String> valueOperations;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private ContextService contextService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        contextService = new ContextService(redisTemplate, mongoTemplate, objectMapper, chatMessageRepository);
        ReflectionTestUtils.setField(contextService, "ttlSeconds", 86400L);
        ReflectionTestUtils.setField(contextService, "historyWindow", TestConstants.HISTORY_MSG_WINDOW);
    }

    @Nested
    @DisplayName("loadSlotState 加载槽位缓存")
    class LoadSlotStateTest {
        @Test
        @DisplayName("Redis命中直接返回，不查Mongo")
        void redisHitSkipMongo() throws Exception {
            SlotState slot = new SlotState();
            slot.setMovieId(1L);
            String json = objectMapper.writeValueAsString(slot);
            when(valueOperations.get(TestConstants.CONTEXT_REDIS_PREFIX + TestConstants.SESSION_ID)).thenReturn(json);
            SlotState res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res.getMovieId()).isEqualTo(1L);
            verifyNoInteractions(mongoTemplate);
        }

        @Test
        @DisplayName("Redis空，查Mongo并回填Redis")
        void redisMissFallbackMongo() {
            when(valueOperations.get(anyString())).thenReturn(null);
            Document mongoDoc = new Document("slotState", Map.of("cinemaId", 2L));
            when(mongoTemplate.findOne(any(Query.class), eq(Document.class), eq("chat_sessions"))).thenReturn(mongoDoc);
            SlotState res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res.getCinemaId()).isEqualTo(2L);
            verify(valueOperations).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Redis JSON损坏，降级Mongo")
        void redisJsonErrorFallbackMongo() {
            when(valueOperations.get(anyString())).thenReturn("{bad json}");
            Document mongoDoc = new Document("slotState", Map.of("movieName", "流浪地球"));
            when(mongoTemplate.findOne(any(Query.class), eq(Document.class), eq("chat_sessions"))).thenReturn(mongoDoc);
            SlotState res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res.getMovieName()).isEqualTo("流浪地球");
        }

        @Test
        @DisplayName("Redis、Mongo均无数据返回空SlotState")
        void allMissReturnEmpty() {
            when(valueOperations.get(anyString())).thenReturn(null);
            when(mongoTemplate.findOne(any(), eq(Document.class), eq("chat_sessions"))).thenReturn(null);
            SlotState res = contextService.loadSlotState(TestConstants.SESSION_ID);
            assertThat(res.getMovieId()).isNull();
            assertThat(res.getMovieName()).isNull();
        }
    }

    @Nested
    @DisplayName("mergeSlots 槽位合并逻辑")
    class MergeSlotsTest {
        @Test
        @DisplayName("新旧槽位合并 - 保留已有字段，写入新字段")
        void mergeNewFields() {
            SlotState existing = new SlotState();
            existing.setMovieId(1L);

            SlotState incoming = new SlotState();
            incoming.setCinemaId(2L);

            SlotState merged = contextService.mergeSlots(existing, incoming);
            assertThat(merged.getMovieId()).isEqualTo(1L);
            assertThat(merged.getCinemaId()).isEqualTo(2L);
        }

        @Test
        @DisplayName("incoming字段覆盖existing同名字段")
        void overwriteSameField() {
            SlotState existing = new SlotState();
            existing.setMovieName("流浪地球");

            SlotState incoming = new SlotState();
            incoming.setMovieName("流浪地球3");

            SlotState merged = contextService.mergeSlots(existing, incoming);
            assertThat(merged.getMovieName()).isEqualTo("流浪地球3");
        }

        @Test
        @DisplayName("incoming null字段不覆盖existing已有值")
        void nullDoesNotOverwrite() {
            SlotState existing = new SlotState();
            existing.setMovieName("流浪地球3");
            existing.setCount(2);

            SlotState incoming = new SlotState();
            incoming.setCount(3);

            SlotState merged = contextService.mergeSlots(existing, incoming);
            assertThat(merged.getMovieName()).isEqualTo("流浪地球3");
            assertThat(merged.getCount()).isEqualTo(3);
        }

        @Test
        @DisplayName("negateSlot清空对应槽位，negateCount自增")
        void handleNegateSlot() {
            SlotState existing = new SlotState();
            existing.setMovieName("test");
            existing.setNegateCount(1);

            SlotState incoming = new SlotState();
            incoming.setNegateSlot("movieName");

            SlotState merged = contextService.mergeSlots(existing, incoming);
            assertThat(merged.getMovieName()).isNull();
            assertThat(merged.getNegateCount()).isEqualTo(2);
            // negateSlot 不持久化
            assertThat(merged.getNegateSlot()).isNull();
        }

        @Test
        @DisplayName("空incoming不修改existing")
        void emptyIncoming() {
            SlotState existing = new SlotState();
            existing.setMovieId(1L);
            existing.setCount(2);

            SlotState merged = contextService.mergeSlots(existing, new SlotState());
            assertThat(merged.getMovieId()).isEqualTo(1L);
            assertThat(merged.getCount()).isEqualTo(2);
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
