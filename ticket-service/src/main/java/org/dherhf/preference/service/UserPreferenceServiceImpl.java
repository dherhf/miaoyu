package org.dherhf.preference.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.result.Result;
import org.dherhf.preference.entity.UserPreference;
import org.dherhf.preference.mapper.UserPreferenceMapper;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.vo.PreferenceVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserPreferenceServiceImpl implements UserPreferenceService {

    private final UserPreferenceMapper userPreferenceMapper;

    @Override
    public Result<PreferenceVO> getPreference(Long userId) {
        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference == null) {
            return Result.success(new PreferenceVO());
        }
        return Result.success(toVO(preference));
    }

    @Override
    public Result<PreferenceVO> updatePreference(Long userId, PreferenceUpdateDTO dto) {
        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference == null) {
            preference = new UserPreference();
            preference.setUserId(userId);
            BeanUtils.copyProperties(dto, preference);
            preference.setUpdatedAt(LocalDateTime.now());
            userPreferenceMapper.insert(preference);
        } else {
            BeanUtils.copyProperties(dto, preference);
            preference.setUpdatedAt(LocalDateTime.now());
            userPreferenceMapper.updateById(preference);
        }
        return Result.success(toVO(preference));
    }

    private PreferenceVO toVO(UserPreference preference) {
        PreferenceVO vo = new PreferenceVO();
        BeanUtils.copyProperties(preference, vo);
        return vo;
    }
}
