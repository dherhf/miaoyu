package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.PageResult;
import org.dherhf.common.Result;
import org.dherhf.service.NotificationService;
import org.dherhf.vo.NotificationVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public Result<PageResult<NotificationVO>> list(
            @RequestAttribute Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer isRead,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return notificationService.list(userId, type, isRead, page, size);
    }

    @PutMapping("/{id}/read")
    public Result<Void> markRead(@PathVariable Long id, @RequestAttribute Long userId) {
        return notificationService.markRead(id, userId);
    }

    @GetMapping("/stream")
    public Result<Void> stream(@RequestAttribute Long userId) {
        // TODO: SSE 实时推送实现
        return Result.success();
    }
}
