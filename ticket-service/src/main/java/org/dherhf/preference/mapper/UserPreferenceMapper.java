package org.dherhf.preference.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.preference.entity.UserPreference;

/**
 * 用户偏好 Mapper 接口，继承 MyBatis-Plus BaseMapper，提供用户偏好的 CRUD 数据库操作。
 */
@Mapper
public interface UserPreferenceMapper extends BaseMapper<UserPreference> {
}