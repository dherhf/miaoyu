package org.dherhf.agent.service;

import org.dherhf.agent.common.TestConstants;
import org.dherhf.agent.document.ChatSessionDocument;
import org.dherhf.agent.repository.ChatSessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.util.ReflectionTestUtils;
import org.bson.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatSessionService 会话管理服务测试")
class ChatSessionServiceTest {
    @Mock
    private ChatSessionRepository repository;
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private ContextService contextService;

    // 由Mockito自动注入三个Mock依赖，不再手动new传参
    @InjectMocks
    private ChatSessionService chatSessionService;

    // 仅注入简单配置字段，无构造器侵入
    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(chatSessionService, "sessionExpireDays", TestConstants.SESSION_EXPIRE_DAYS);
    }

    @Nested
    @DisplayName("createSession 创建会话")
    class CreateSessionTest {
        @Test
        @DisplayName("无自定义标题默认「新对话」")
        void createWithDefaultTitle() {
            ChatSessionDocument saved = buildDoc("gen-id", TestConstants.USER_ID, "新对话");
            when(repository.save(any())).thenReturn(saved);
            ChatSessionDocument result = chatSessionService.createSession(TestConstants.USER_ID, null);
            assertThat(result.getTitle()).isEqualTo("新对话");
            verify(repository).save(any(ChatSessionDocument.class));
        }

        @Test
        @DisplayName("自定义标题正常赋值")
        void createWithCustomTitle() {
            ChatSessionDocument saved = buildDoc("gen-id", TestConstants.USER_ID, "购票咨询");
            when(repository.save(any())).thenReturn(saved);
            ChatSessionDocument result = chatSessionService.createSession(TestConstants.USER_ID, "购票咨询");
            assertThat(result.getTitle()).isEqualTo("购票咨询");
        }
    }

    @Nested
    @DisplayName("listSessions 分页查询会话")
    class ListSessionsTest {
        @Test
        @DisplayName("按lastMessageAt倒序分页")
        void pageOrderByLastMsgDesc() {
            ChatSessionDocument old = buildDoc("s1", TestConstants.USER_ID, "会话1", LocalDateTime.now().minusHours(1));
            ChatSessionDocument newDoc = buildDoc("s2", TestConstants.USER_ID, "会话2", LocalDateTime.now());
            when(mongoTemplate.find(any(Query.class), eq(ChatSessionDocument.class))).thenReturn(List.of(newDoc, old));
            List<ChatSessionDocument> list = chatSessionService.listSessions(TestConstants.USER_ID, 0, 20);
            assertThat(list).containsExactly(newDoc, old);
            verify(mongoTemplate).find(argThat(q ->
                    q.getQueryObject().get("userId").equals(TestConstants.USER_ID)
            ), eq(ChatSessionDocument.class));
        }

        @Test
        @DisplayName("无会话返回空列表")
        void emptyWhenNoSession() {
            when(mongoTemplate.find(any(Query.class), eq(ChatSessionDocument.class))).thenReturn(List.of());
            assertThat(chatSessionService.listSessions(TestConstants.USER_ID, 0, 20)).isEmpty();
        }
    }

    @Nested
    @DisplayName("getSession 查询会话详情")
    class GetSessionTest {
        @Test
        @DisplayName("会话存在且用户匹配返回数据")
        void findMatchUser() {
            ChatSessionDocument doc = buildDoc(TestConstants.SESSION_ID, TestConstants.USER_ID, "测试");
            when(repository.findBySessionId(TestConstants.SESSION_ID)).thenReturn(Optional.of(doc));
            Optional<ChatSessionDocument> opt = chatSessionService.getSession(TestConstants.SESSION_ID, TestConstants.USER_ID);
            assertThat(opt).isPresent();
        }

        @Test
        @DisplayName("会话归属他人返回空")
        void otherUserReturnEmpty() {
            ChatSessionDocument doc = buildDoc(TestConstants.SESSION_ID, TestConstants.OTHER_USER_ID, "他人");
            when(repository.findBySessionId(TestConstants.SESSION_ID)).thenReturn(Optional.of(doc));
            assertThat(chatSessionService.getSession(TestConstants.SESSION_ID, TestConstants.USER_ID)).isEmpty();
        }

        @Test
        @DisplayName("会话不存在返回空")
        void notFoundReturnEmpty() {
            when(repository.findBySessionId(TestConstants.SESSION_ID)).thenReturn(Optional.empty());
            assertThat(chatSessionService.getSession(TestConstants.SESSION_ID, TestConstants.USER_ID)).isEmpty();
        }
    }

    @Nested
    @DisplayName("deleteSession 删除会话")
    class DeleteSessionTest {
        @Test
        @DisplayName("本人会话删除并清理上下文")
        void deleteSuccessClearContext() {
            ChatSessionDocument doc = buildDoc(TestConstants.SESSION_ID, TestConstants.USER_ID, "测试");
            when(repository.findBySessionId(TestConstants.SESSION_ID)).thenReturn(Optional.of(doc));
            boolean res = chatSessionService.deleteSession(TestConstants.SESSION_ID, TestConstants.USER_ID);
            assertThat(res).isTrue();
            verify(mongoTemplate).remove(any(Query.class), eq(ChatSessionDocument.class));
            verify(contextService).clearContext(TestConstants.SESSION_ID);
        }

        @Test
        @DisplayName("他人会话不删除、不清理上下文")
        void otherUserNoOp() {
            ChatSessionDocument doc = buildDoc(TestConstants.SESSION_ID, TestConstants.OTHER_USER_ID, "他人");
            when(repository.findBySessionId(TestConstants.SESSION_ID)).thenReturn(Optional.of(doc));
            boolean res = chatSessionService.deleteSession(TestConstants.SESSION_ID, TestConstants.USER_ID);
            assertThat(res).isFalse();
            verifyNoInteractions(contextService);
        }
    }

    @Nested
    @DisplayName("markCompleted 标记会话完成")
    class MarkCompletedTest {
        @Test
        @DisplayName("更新status为COMPLETED，匹配sessionId")
        void updateStatusComplete() {
            chatSessionService.markCompleted(TestConstants.SESSION_ID);
            verify(mongoTemplate).updateFirst(
                    argThat(q -> q.getQueryObject().get("sessionId").equals(TestConstants.SESSION_ID)),
                    argThat(u -> ((Document) u.getUpdateObject().get("$set")).get("status").equals("completed")),
                    eq(ChatSessionDocument.class)
            );
        }
    }

    private ChatSessionDocument buildDoc(String sid, Long uid, String title) {
        return buildDoc(sid, uid, title, LocalDateTime.now());
    }

    private ChatSessionDocument buildDoc(String sid, Long uid, String title, LocalDateTime lastMsgTime) {
        ChatSessionDocument doc = new ChatSessionDocument();
        doc.setSessionId(sid);
        doc.setUserId(uid);
        doc.setTitle(title);
        doc.setStatus("ACTIVE");
        doc.setCreatedAt(LocalDateTime.now().minusDays(1));
        doc.setLastMessageAt(lastMsgTime);
        doc.setMessages(List.of());
        return doc;
    }
}
