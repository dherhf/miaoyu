package org.dherhf.notification.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.notification.service.NotificationSseManager;
import org.dherhf.notification.service.NotificationService;
import org.dherhf.notification.vo.NotificationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "消息通知", description = "通知列表/标记已读")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseManager sseManager;

    @Operation(summary = "通知列表")
    @GetMapping
    public Result<PageResult<NotificationVO>> list(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer isRead,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(notificationService.list(userId, type, isRead, page, size));
    }

    @Operation(summary = "标记通知已读")
    @PutMapping("/{id}/read")
    public Result<Void> markRead(@PathVariable Long id, @RequestHeader("X-User-Id") Long userId) {
        notificationService.markRead(id, userId);
        return Result.success();
    }

    @Operation(summary = "通知实时推送")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestHeader("X-User-Id") Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        sseManager.register(userId, emitter);
        return emitter;
    }
}
