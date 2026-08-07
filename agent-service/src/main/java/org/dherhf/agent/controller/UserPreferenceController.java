package org.dherhf.agent.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.agent.model.dto.PreferenceUpdateDTO;
import org.dherhf.agent.model.vo.PreferenceVO;
import org.dherhf.agent.service.UserPreferenceService;
import org.dherhf.common.result.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户偏好接口控制器。
 * <p>
 * 偏好数据存储于 MongoDB，对话时注入 LLM 上下文实现个性化推荐。
 * userId 通过 {@code X-User-Id} Header 注入（由 Gateway 统一 JWT 校验）。
 * </p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat/users")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    @GetMapping("/preferences")
    public Result<PreferenceVO> getPreference(@RequestHeader("X-User-Id") Long userId) {
        log.info("获取偏好");
        return Result.success(userPreferenceService.getPreferenceVO(userId));
    }

    @PutMapping("/preferences")
    public Result<PreferenceVO> updatePreference(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody PreferenceUpdateDTO dto) {
        log.info("更新偏好");
        return Result.success(userPreferenceService.updatePreference(userId, dto));
    }
}
