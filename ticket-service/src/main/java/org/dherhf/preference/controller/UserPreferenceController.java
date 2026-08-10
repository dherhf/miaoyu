package org.dherhf.preference.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.Result;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.service.UserPreferenceService;
import org.dherhf.preference.vo.PreferenceVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 用户偏好控制器。
 * <p>
 * 提供用户偏好的获取和更新接口，
 * 路径前缀 {@code /api/v1/users}。
 * 用户身份通过请求头 {@code X-User-Id} 获取（由 Gateway 注入）。
 */
@Tag(name = "用户偏好", description = "偏好获取/更新")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    /**
     * 获取当前用户的偏好设置，若没有则返回空偏好。
     *
     * @param userId 用户 ID（从请求头获取）
     * @return 用户偏好
     */
    @Operation(summary = "获取用户偏好")
    @GetMapping("/preferences")
    public Result<PreferenceVO> getPreference(@Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        return Result.success(userPreferenceService.getPreference(userId));
    }

    /**
     * 更新当前用户的偏好设置，不存在则创建。
     *
     * @param userId 用户 ID（从请求头获取）
     * @param dto    偏好更新参数
     * @return 更新后的用户偏好
     */
    @Operation(summary = "更新用户偏好")
    @PutMapping("/preferences")
    public Result<PreferenceVO> updatePreference(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @RequestBody PreferenceUpdateDTO dto) {
        return Result.success(userPreferenceService.updatePreference(userId, dto));
    }
}