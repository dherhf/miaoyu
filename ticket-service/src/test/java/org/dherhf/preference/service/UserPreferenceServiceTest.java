package org.dherhf.preference.service;

import org.dherhf.preference.entity.UserPreference;
import org.dherhf.preference.mapper.UserPreferenceMapper;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
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
        UserPreference pref = UserPreference.builder().userId(1L).preferredHallType("IMAX").priceMin(new BigDecimal("20")).priceMax(new BigDecimal("60")).preferredMovieTypes(List.of("科幻", "喜剧")).build();
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

        PreferenceUpdateDTO dto = PreferenceUpdateDTO.builder().preferredHallType("IMAX").build();

        PreferenceVO result = userPreferenceService.updatePreference(1L, dto);

        assertEquals("IMAX", result.getPreferredHallType());
        verify(userPreferenceMapper).insert(any(UserPreference.class));
        System.out.println("[UserPreferenceServiceTest] ✓ updatePreference_createsNew PASSED");
    }

    @Test
    void updatePreference_updatesExisting() {
        System.out.println("[UserPreferenceServiceTest] ▶ updatePreference_updatesExisting");
        UserPreference pref = UserPreference.builder().id(1L).userId(1L).preferredHallType("2D").build();
        when(userPreferenceMapper.selectOne(any())).thenReturn(pref);
        when(userPreferenceMapper.updateById(any(UserPreference.class))).thenReturn(1);

        PreferenceUpdateDTO dto = PreferenceUpdateDTO.builder().preferredHallType("IMAX").build();

        PreferenceVO result = userPreferenceService.updatePreference(1L, dto);

        assertEquals("IMAX", result.getPreferredHallType());
        verify(userPreferenceMapper).updateById(any(UserPreference.class));
        System.out.println("[UserPreferenceServiceTest] ✓ updatePreference_updatesExisting PASSED");
    }
}
