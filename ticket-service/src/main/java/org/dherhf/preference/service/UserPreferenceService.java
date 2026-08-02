package org.dherhf.preference.service;

import org.dherhf.common.result.Result;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.vo.PreferenceVO;

public interface UserPreferenceService {

    Result<PreferenceVO> getPreference(Long userId);

    Result<PreferenceVO> updatePreference(Long userId, PreferenceUpdateDTO dto);
}
