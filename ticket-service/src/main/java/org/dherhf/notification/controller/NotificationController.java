package org.dherhf.notification.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.notification.service.NotificationSseManager;
import org.dherhf.notification.service.NotificationService;
import org.dherhf.notification.vo.NotificationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 消息通知控制器。
 * <p>
 * 提供通知列表查询、标记已读和 SSE 实时推送接口，
 * 路径前缀 {@code /api/v1/notifications}。
 * 用户身份通过请求头 {@code X-User-Id} 获取（由 Gateway 注入）。
 */
@Tag(name = "消息通知", description = "通知列表/标记已读")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseManager sseManager;

    /**
     * 查询当前用户的通知列表，支持按类型和已读状态筛选。
     *
     * @param userId 用户 ID（从请求头获取）
     * @param type   通知类型
     * @param isRead 是否已读（0-未读，1-已读）
     * @param page   页码
     * @param size   每页条数
     * @return 分页通知列表
     */
    @Operation(summary = "通知列表")
    @GetMapping
    public Result<PageResult<NotificationVO>> list(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Parameter(description = "通知类型") @RequestParam(required = false) String type,
            @Parameter(description = "是否已读") @RequestParam(required = false) Integer isRead,
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页条数") @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(notificationService.list(userId, type, isRead, page, size));
    }

    /**
     * 标记指定通知为已读。
     *
     * @param id     通知 ID
     * @param userId 用户 ID（从请求头获取，用于权限校验）
     * @return 空响应
     */
    @Operation(summary = "标记通知已读")
    @PutMapping("/{id}/read")
    public Result<Void> markRead(
            @Parameter(description = "通知 ID") @PathVariable Long id,
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        notificationService.markRead(id, userId);
        return Result.success();
    }

    /**
     * 建立 SSE 长连接，接收实时通知推送。
     *
     * @param userId 用户 ID（从请求头获取）
     * @return SSE Emitter 对象，持续推送通知事件
     */
    @Operation(summary = "通知实时推送")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        sseManager.register(userId, emitter);
        return emitter;
    }
}
