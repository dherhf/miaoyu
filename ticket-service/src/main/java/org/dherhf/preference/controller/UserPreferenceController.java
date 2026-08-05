package org.dherhf.preference.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.Result;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.service.UserPreferenceService;
import org.dherhf.preference.vo.PreferenceVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "用户偏好", description = "偏好获取/更新")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    @Operation(summary = "获取用户偏好")
    @GetMapping("/preferences")
    public Result<PreferenceVO> getPreference(@RequestHeader("X-User-Id") Long userId) {
        return Result.success(userPreferenceService.getPreference(userId));
    }

    @Operation(summary = "更新用户偏好")
    @PutMapping("/preferences")
    public Result<PreferenceVO> updatePreference(@RequestHeader("X-User-Id") Long userId, @RequestBody PreferenceUpdateDTO dto) {
        return Result.success(userPreferenceService.updatePreference(userId, dto));
    }
}
