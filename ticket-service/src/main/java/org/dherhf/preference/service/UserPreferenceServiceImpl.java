package org.dherhf.preference.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.preference.entity.UserPreference;
import org.dherhf.preference.mapper.UserPreferenceMapper;
import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.vo.PreferenceVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 用户偏好服务实现类。
 * <p>
 * 实现用户偏好的获取和更新，更新时若用户尚无偏好记录则先创建。
 */
@Service
@RequiredArgsConstructor
public class UserPreferenceServiceImpl implements UserPreferenceService {

    private final UserPreferenceMapper userPreferenceMapper;

    /**
     * 获取用户偏好，若不存在则返回空 VO。
     *
     * @param userId 用户 ID
     * @return 用户偏好
     */
    @Override
    public PreferenceVO getPreference(Long userId) {
        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference == null) {
            return new PreferenceVO();
        }
        return toVO(preference);
    }

    /**
     * 更新用户偏好，不存在则创建新记录，存在则更新并刷新更新时间。
     *
     * @param userId 用户 ID
     * @param dto    偏好更新参数
     * @return 更新后的用户偏好
     */
    @Override
    public PreferenceVO updatePreference(Long userId, PreferenceUpdateDTO dto) {
        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference == null) {
            preference = UserPreference.builder()
                    .userId(userId)
                    .updatedAt(LocalDateTime.now())
                    .build();
            BeanUtils.copyProperties(dto, preference);
            userPreferenceMapper.insert(preference);
        } else {
            BeanUtils.copyProperties(dto, preference);
            preference.setUpdatedAt(LocalDateTime.now());
            userPreferenceMapper.updateById(preference);
        }
        return toVO(preference);
    }

    /**
     * 将用户偏好实体转换为 VO。
     *
     * @param preference 用户偏好实体
     * @return 用户偏好 VO
     */
    private PreferenceVO toVO(UserPreference preference) {
        PreferenceVO vo = new PreferenceVO();
        BeanUtils.copyProperties(preference, vo);
        return vo;
    }
}