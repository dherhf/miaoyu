package org.dherhf.agent.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.common.ErrorCodeEnum;
import org.dherhf.common.util.JwtUtil;
import org.dherhf.common.result.Result;
import org.dherhf.agent.model.dto.CreateSessionRequest;
import org.dherhf.agent.model.dto.CreateSessionResponse;
import org.dherhf.agent.model.dto.SendMessageRequest;
import org.dherhf.agent.model.dto.SessionDetailResponse;
import org.dherhf.agent.model.dto.SessionListResponse;
import org.dherhf.agent.document.ChatSessionDocument;
import org.dherhf.agent.service.ChatSessionService;
import org.dherhf.agent.service.DialogueService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 对话接口控制器（对应系分 §3.9.1 - 5 个 API）。
 * <p>
 * 所有接口都需要 JWT 认证，从 Authorization 头解析 userId。
 * </p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatSessionService chatSessionService;
    private final DialogueService dialogueService;
    private final JwtUtil jwtUtil;

    /**
     * 1. 创建对话会话
     * POST /api/v1/chat/sessions
     */
    @PostMapping("/sessions")
    public Result<CreateSessionResponse> createSession(
            @Valid @RequestBody(required = false) CreateSessionRequest request,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId(httpRequest);
        if (userId == null) {
            return Result.error(ErrorCodeEnum.UNAUTHORIZED.getCode(), ErrorCodeEnum.UNAUTHORIZED.getMessage());
        }
        String title = request == null ? null : request.getTitle();
        ChatSessionDocument session = chatSessionService.createSession(userId, title);

        CreateSessionResponse resp = new CreateSessionResponse();
        resp.setSessionId(session.getSessionId());
        resp.setTitle(session.getTitle());
        resp.setStatus(session.getStatus());
        resp.setSlotState(session.getSlotState());
        resp.setCreatedAt(session.getCreatedAt());
        return Result.success(resp);
    }

    /**
     * 2. 发送对话消息（SSE 流式响应）
     * POST /api/v1/chat/sessions/{id}/messages
     */
    @PostMapping("/sessions/{id}/messages")
    public SseEmitter sendMessage(
            @PathVariable String id,
            @Valid @RequestBody SendMessageRequest request,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId(httpRequest);
        if (userId == null) {
            SseEmitter emitter = new SseEmitter(5000L);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data(Map.of("code", 401, "message", "未登录或登录已过期")));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        log.info("[sendMessage] sessionId={}, userId={}, content={}",
                id, userId, request.getContent());

        return dialogueService.handleMessage(
                id,
                userId,
                request.getContent(),
                request.getSessionId(),
                request.getSeatIds(),
                request.getTicketCount()
        );
    }

    /**
     * 3. 查询会话列表
     * GET /api/v1/chat/sessions?page=0&size=20
     */
    @GetMapping("/sessions")
    public Result<SessionListResponse> listSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId(httpRequest);
        if (userId == null) {
            return Result.error(ErrorCodeEnum.UNAUTHORIZED.getCode(), ErrorCodeEnum.UNAUTHORIZED.getMessage());
        }

        List<ChatSessionDocument> sessions = chatSessionService.listSessions(userId, page, size);
        long total = chatSessionService.countSessions(userId);

        SessionListResponse resp = new SessionListResponse();
        resp.setTotal(total);
        resp.setPage(page);
        resp.setSize(size);
        resp.setRecords(sessions.stream().map(s -> {
            SessionListResponse.SessionSummary summary = new SessionListResponse.SessionSummary();
            summary.setSessionId(s.getSessionId());
            summary.setTitle(s.getTitle());
            summary.setStatus(s.getStatus());
            summary.setLastMessageAt(s.getLastMessageAt());
            summary.setCreatedAt(s.getCreatedAt());
            return summary;
        }).collect(Collectors.toList()));

        return Result.success(resp);
    }

    /**
     * 4. 查询会话详情
     * GET /api/v1/chat/sessions/{id}
     */
    @GetMapping("/sessions/{id}")
    public Result<SessionDetailResponse> getSession(
            @PathVariable String id,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId(httpRequest);
        if (userId == null) {
            return Result.error(ErrorCodeEnum.UNAUTHORIZED.getCode(), ErrorCodeEnum.UNAUTHORIZED.getMessage());
        }

        var opt = chatSessionService.getSession(id, userId);
        if (opt.isEmpty()) {
            return Result.error(ErrorCodeEnum.SESSION_NOT_FOUND.getCode(), ErrorCodeEnum.SESSION_NOT_FOUND.getMessage());
        }

        ChatSessionDocument session = opt.get();
        SessionDetailResponse resp = new SessionDetailResponse();
        resp.setSessionId(session.getSessionId());
        resp.setTitle(session.getTitle());
        resp.setStatus(session.getStatus());
        resp.setSlotState(session.getSlotState());
        resp.setCreatedAt(session.getCreatedAt());

        List<SessionDetailResponse.MessageItem> items = session.getMessages().stream()
                .map(m -> {
                    SessionDetailResponse.MessageItem item = new SessionDetailResponse.MessageItem();
                    item.setMsgId(m.getMsgId());
                    item.setRole(m.getRole());
                    item.setContent(m.getContent());
                    item.setCardType(m.getCardType());
                    item.setCardData(m.getCardData());
                    item.setIntent(m.getIntent());
                    item.setSlots(m.getSlots());
                    item.setCreatedAt(m.getCreatedAt());
                    return item;
                })
                .collect(Collectors.toList());
        resp.setMessages(items);

        return Result.success(resp);
    }

    /**
     * 5. 删除会话
     * DELETE /api/v1/chat/sessions/{id}
     */
    @DeleteMapping("/sessions/{id}")
    public Result<Void> deleteSession(
            @PathVariable String id,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId(httpRequest);
        if (userId == null) {
            return Result.error(ErrorCodeEnum.UNAUTHORIZED.getCode(), ErrorCodeEnum.UNAUTHORIZED.getMessage());
        }

        boolean deleted = chatSessionService.deleteSession(id, userId);
        if (!deleted) {
            return Result.error(ErrorCodeEnum.SESSION_NOT_FOUND.getCode(), ErrorCodeEnum.SESSION_NOT_FOUND.getMessage());
        }
        return Result.success();
    }

    // ---- 内部方法 ----

    private Long resolveUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            return null;
        }
        String token = auth.substring(7);
        return jwtUtil.getUserId(token);
    }
}
