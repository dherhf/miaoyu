package org.dherhf.notification.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.PageResult;
import org.dherhf.common.result.Result;
import org.dherhf.notification.service.NotificationService;
import org.dherhf.notification.vo.NotificationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "消息通知", description = "通知列表/标记已读")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "通知列表")
    @GetMapping
    public Result<PageResult<NotificationVO>> list(
            @RequestAttribute Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer isRead,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return notificationService.list(userId, type, isRead, page, size);
    }

    @Operation(summary = "标记通知已读")
    @PutMapping("/{id}/read")
    public Result<Void> markRead(@PathVariable Long id, @RequestAttribute Long userId) {
        return notificationService.markRead(id, userId);
    }

    @Operation(summary = "通知实时推送")
    @GetMapping("/stream")
    public Result<Void> stream(@RequestAttribute Long userId) {
        // TODO: SSE 实时推送实现
        return Result.success();
    }
}
