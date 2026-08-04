package org.dherhf.agent.controller;

import tools.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.dherhf.agent.common.JwtUtil;
import org.dherhf.agent.document.ChatMessage;
import org.dherhf.agent.document.ChatSessionDocument;
import org.dherhf.agent.enums.SessionStatusEnum;
import org.dherhf.agent.model.dto.CreateSessionRequest;
import org.dherhf.agent.model.dto.SendMessageRequest;
import org.dherhf.agent.service.ChatSessionService;
import org.dherhf.agent.service.DialogueService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("ChatController 对话接口测试")
@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ChatSessionService chatSessionService;
    @Mock
    private DialogueService dialogueService;
    @Mock
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        ChatController controller = new ChatController(chatSessionService, dialogueService, jwtUtil);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    /**
     * 生成一个有效的 JWT token 用于测试
     */
    private String generateTestToken(Long userId) {
        return Jwts.builder()
                .issuer("miaoyu")
                .claim("userId", userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86400000))
                .signWith(Keys.hmacShaKeyFor("miaoyu-ticket-service-jwt-secret-key-2026".getBytes()))
                .compact();
    }

    @Nested
    @DisplayName("POST /api/v1/chat/sessions - 创建会话")
    class CreateSessionTest {

        @Test
        @DisplayName("无 Token 时返回 401")
        void noToken() throws Exception {
            mockMvc.perform(post("/api/v1/chat/sessions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(401));
        }

        @Test
        @DisplayName("有效 Token + 标题创建成功")
        void createWithTitle() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            ChatSessionDocument doc = new ChatSessionDocument();
            doc.setSessionId("abc123");
            doc.setUserId(100L);
            doc.setTitle("测试会话");
            doc.setStatus(SessionStatusEnum.ACTIVE.getValue());
            doc.setSlotState(null);
            doc.setCreatedAt(LocalDateTime.now());
            when(chatSessionService.createSession(eq(100L), eq("测试会话")))
                    .thenReturn(doc);

            CreateSessionRequest req = new CreateSessionRequest();
            req.setTitle("测试会话");

            mockMvc.perform(post("/api/v1/chat/sessions")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.sessionId").value("abc123"))
                    .andExpect(jsonPath("$.data.title").value("测试会话"))
                    .andExpect(jsonPath("$.data.status").value("active"));
        }

        @Test
        @DisplayName("无 body 时使用默认标题创建")
        void createWithoutBody() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            ChatSessionDocument doc = new ChatSessionDocument();
            doc.setSessionId("def456");
            doc.setUserId(100L);
            doc.setTitle("新对话");
            doc.setStatus(SessionStatusEnum.ACTIVE.getValue());
            when(chatSessionService.createSession(eq(100L), isNull()))
                    .thenReturn(doc);

            mockMvc.perform(post("/api/v1/chat/sessions")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.title").value("新对话"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/chat/sessions/{id}/messages - 发送消息")
    class SendMessageTest {

        @Test
        @DisplayName("有效 Token 返回 SseEmitter（HTTP 200）")
        void withToken() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            // 返回一个真实的 SseEmitter（不调用 asyncDispatch，只验证 HTTP 200）
            SseEmitter mockEmitter = new SseEmitter(5000L);
            when(dialogueService.handleMessage(eq("sess1"), eq(100L), eq("你好"), any(), any(), any()))
                    .thenReturn(mockEmitter);

            SendMessageRequest req = new SendMessageRequest();
            req.setContent("你好");

            mockMvc.perform(post("/api/v1/chat/sessions/sess1/messages")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("无 Token 时 SSE error 事件")
        void noToken() throws Exception {
            SendMessageRequest req = new SendMessageRequest();
            req.setContent("你好");

            mockMvc.perform(post("/api/v1/chat/sessions/sess1/messages")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("消息内容为空时校验失败")
        void emptyContent() throws Exception {
            String token = generateTestToken(100L);
            lenient().when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            SendMessageRequest req = new SendMessageRequest();
            req.setContent("");

            mockMvc.perform(post("/api/v1/chat/sessions/sess1/messages")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/chat/sessions - 会话列表")
    class ListSessionsTest {

        @Test
        @DisplayName("无 Token 返回 401")
        void noToken() throws Exception {
            mockMvc.perform(get("/api/v1/chat/sessions"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(401));
        }

        @Test
        @DisplayName("分页查询返回列表")
        void paginatedList() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            ChatSessionDocument doc = new ChatSessionDocument();
            doc.setSessionId("s1");
            doc.setUserId(100L);
            doc.setTitle("测试");
            doc.setStatus("active");
            doc.setLastMessageAt(LocalDateTime.now());
            doc.setCreatedAt(LocalDateTime.now());

            when(chatSessionService.listSessions(100L, 0, 20))
                    .thenReturn(List.of(doc));
            when(chatSessionService.countSessions(100L)).thenReturn(1L);

            mockMvc.perform(get("/api/v1/chat/sessions")
                            .header("Authorization", "Bearer " + token)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.total").value(1))
                    .andExpect(jsonPath("$.data.page").value(0))
                    .andExpect(jsonPath("$.data.size").value(20))
                    .andExpect(jsonPath("$.data.records[0].sessionId").value("s1"));
        }

        @Test
        @DisplayName("使用默认分页参数")
        void defaultPaging() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            when(chatSessionService.listSessions(100L, 0, 20))
                    .thenReturn(List.of());
            when(chatSessionService.countSessions(100L)).thenReturn(0L);

            mockMvc.perform(get("/api/v1/chat/sessions")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.total").value(0));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/chat/sessions/{id} - 会话详情")
    class GetSessionTest {

        @Test
        @DisplayName("无 Token 返回 401")
        void noToken() throws Exception {
            mockMvc.perform(get("/api/v1/chat/sessions/sess1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(401));
        }

        @Test
        @DisplayName("会话不存在返回 40002（SESSION_NOT_FOUND）")
        void notFound() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            when(chatSessionService.getSession("sess1", 100L))
                    .thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(40002));
        }

        @Test
        @DisplayName("访问他人会话也返回 40002（不泄露资源是否存在）")
        void accessOtherUserSession() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            // getSession 按 sessionId + userId 查询，他人会话查不到 → empty
            when(chatSessionService.getSession("sess1", 100L))
                    .thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(40002));
        }

        @Test
        @DisplayName("存在时返回详情含消息列表")
        void found() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);

            ChatSessionDocument doc = new ChatSessionDocument();
            doc.setSessionId("sess1");
            doc.setUserId(100L);
            doc.setTitle("测试");
            doc.setStatus("active");
            doc.setSlotState(null);
            doc.setCreatedAt(LocalDateTime.now());

            ChatMessage msg = new ChatMessage();
            msg.setMsgId(1);
            msg.setRole("user");
            msg.setContent("你好");
            msg.setCreatedAt(LocalDateTime.now());
            doc.setMessages(List.of(msg));

            when(chatSessionService.getSession("sess1", 100L))
                    .thenReturn(Optional.of(doc));

            mockMvc.perform(get("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0))
                    .andExpect(jsonPath("$.data.sessionId").value("sess1"))
                    .andExpect(jsonPath("$.data.messages[0].content").value("你好"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/chat/sessions/{id} - 删除会话")
    class DeleteSessionTest {

        @Test
        @DisplayName("无 Token 返回 401")
        void noToken() throws Exception {
            mockMvc.perform(delete("/api/v1/chat/sessions/sess1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(401));
        }

        @Test
        @DisplayName("删除成功返回 code=0")
        void deleteSuccess() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            when(chatSessionService.deleteSession("sess1", 100L)).thenReturn(true);

            mockMvc.perform(delete("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(0));
        }

        @Test
        @DisplayName("不存在时返回 40002（SESSION_NOT_FOUND）")
        void deleteNotFound() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            when(chatSessionService.deleteSession("sess1", 100L)).thenReturn(false);

            mockMvc.perform(delete("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(40002));
        }

        @Test
        @DisplayName("删除他人会话也返回 40002（不泄露资源是否存在）")
        void deleteOtherUserSession() throws Exception {
            String token = generateTestToken(100L);
            when(jwtUtil.parseUserId(anyString())).thenReturn(100L);
            // deleteSession 按 sessionId + userId 删除，他人会话删不到 → false
            when(chatSessionService.deleteSession("sess1", 100L)).thenReturn(false);

            mockMvc.perform(delete("/api/v1/chat/sessions/sess1")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(40002));
        }
    }
}
