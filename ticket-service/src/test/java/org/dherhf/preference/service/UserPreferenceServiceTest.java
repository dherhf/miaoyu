package org.dherhf.preference.service;

import org.dherhf.preference.entity.UserPreference;
import org.dherhf.preference.mapper.UserPreferenceMapper;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.service.UserPreferenceServiceImpl;
import org.dherhf.preference.vo.PreferenceVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserPreferenceServiceTest {

    @Mock
    private UserPreferenceMapper userPreferenceMapper;

    @InjectMocks
    private UserPreferenceServiceImpl userPreferenceService;

    @Test
    void getPreference_notFound_returnsEmpty() {
        System.out.println("[UserPreferenceServiceTest] ▶ getPreference_notFound_returnsEmpty");
        when(userPreferenceMapper.selectOne(any())).thenReturn(null);

        PreferenceVO result = userPreferenceService.getPreference(1L);

        assertNotNull(result);
        System.out.println("[UserPreferenceServiceTest] ✓ getPreference_notFound_returnsEmpty PASSED");
    }

    @Test
    void getPreference_found_returnsData() {
        System.out.println("[UserPreferenceServiceTest] ▶ getPreference_found_returnsData");
        UserPreference pref = new UserPreference();
        pref.setUserId(1L);
        pref.setPreferredHallType("IMAX");
        pref.setPriceMin(new BigDecimal("20"));
        pref.setPriceMax(new BigDecimal("60"));
        pref.setPreferredMovieTypes(List.of("科幻", "喜剧"));
        when(userPreferenceMapper.selectOne(any())).thenReturn(pref);

        PreferenceVO result = userPreferenceService.getPreference(1L);

        assertEquals("IMAX", result.getPreferredHallType());
        System.out.println("[UserPreferenceServiceTest] ✓ getPreference_found_returnsData PASSED");
    }

    @Test
    void updatePreference_createsNew() {
        System.out.println("[UserPreferenceServiceTest] ▶ updatePreference_createsNew");
        when(userPreferenceMapper.selectOne(any())).thenReturn(null);
        when(userPreferenceMapper.insert(any(UserPreference.class))).thenReturn(1);

        PreferenceUpdateDTO dto = new PreferenceUpdateDTO();
        dto.setPreferredHallType("IMAX");

        PreferenceVO result = userPreferenceService.updatePreference(1L, dto);

        assertEquals("IMAX", result.getPreferredHallType());
        verify(userPreferenceMapper).insert(any(UserPreference.class));
        System.out.println("[UserPreferenceServiceTest] ✓ updatePreference_createsNew PASSED");
    }

    @Test
    void updatePreference_updatesExisting() {
        System.out.println("[UserPreferenceServiceTest] ▶ updatePreference_updatesExisting");
        UserPreference pref = new UserPreference();
        pref.setId(1L);
        pref.setUserId(1L);
        pref.setPreferredHallType("2D");
        when(userPreferenceMapper.selectOne(any())).thenReturn(pref);
        when(userPreferenceMapper.updateById(any(UserPreference.class))).thenReturn(1);

        PreferenceUpdateDTO dto = new PreferenceUpdateDTO();
        dto.setPreferredHallType("IMAX");

        PreferenceVO result = userPreferenceService.updatePreference(1L, dto);

        assertEquals("IMAX", result.getPreferredHallType());
        verify(userPreferenceMapper).updateById(any(UserPreference.class));
        System.out.println("[UserPreferenceServiceTest] ✓ updatePreference_updatesExisting PASSED");
    }
}
