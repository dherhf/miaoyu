package org.dherhf.preference.service;

import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.vo.PreferenceVO;

public interface UserPreferenceService {

    PreferenceVO getPreference(Long userId);

    PreferenceVO updatePreference(Long userId, PreferenceUpdateDTO dto);
}
