package org.dherhf.preference.service;

import org.dherhf.preference.dto.PreferenceUpdateDTO;
import org.dherhf.preference.vo.PreferenceVO;

/**
 * 用户偏好服务接口。
 * <p>
 * 定义用户偏好的获取和更新方法。
 */
public interface UserPreferenceService {

    /**
     * 获取用户偏好，若不存在则返回空偏好。
     *
     * @param userId 用户 ID
     * @return 用户偏好
     */
    PreferenceVO getPreference(Long userId);

    /**
     * 更新用户偏好，不存在则创建。
     *
     * @param userId 用户 ID
     * @param dto    偏好更新参数
     * @return 更新后的用户偏好
     */
    PreferenceVO updatePreference(Long userId, PreferenceUpdateDTO dto);
}