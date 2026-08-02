package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.Result;
import org.dherhf.dto.PreferenceUpdateDTO;
import org.dherhf.service.UserPreferenceService;
import org.dherhf.vo.PreferenceVO;
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
    public Result<PreferenceVO> getPreference(@RequestAttribute Long userId) {
        return userPreferenceService.getPreference(userId);
    }

    @Operation(summary = "更新用户偏好")
    @PutMapping("/preferences")
    public Result<PreferenceVO> updatePreference(@RequestAttribute Long userId, @RequestBody PreferenceUpdateDTO dto) {
        return userPreferenceService.updatePreference(userId, dto);
    }
}
