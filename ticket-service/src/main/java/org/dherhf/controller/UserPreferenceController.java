package org.dherhf.controller;

import lombok.RequiredArgsConstructor;
import org.dherhf.common.Result;
import org.dherhf.dto.PreferenceUpdateDTO;
import org.dherhf.service.UserPreferenceService;
import org.dherhf.vo.PreferenceVO;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    @GetMapping("/preferences")
    public Result<PreferenceVO> getPreference(@RequestAttribute Long userId) {
        return userPreferenceService.getPreference(userId);
    }

    @PutMapping("/preferences")
    public Result<PreferenceVO> updatePreference(@RequestAttribute Long userId, @RequestBody PreferenceUpdateDTO dto) {
        return userPreferenceService.updatePreference(userId, dto);
    }
}
