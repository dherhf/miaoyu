package org.dherhf.service;

import org.dherhf.common.Result;
import org.dherhf.dto.PreferenceUpdateDTO;
import org.dherhf.vo.PreferenceVO;

public interface UserPreferenceService {

    Result<PreferenceVO> getPreference(Long userId);

    Result<PreferenceVO> updatePreference(Long userId, PreferenceUpdateDTO dto);
}
