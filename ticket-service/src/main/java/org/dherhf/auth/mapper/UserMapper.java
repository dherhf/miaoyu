package org.dherhf.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.auth.entity.User;

/**
 * 用户表 Mapper 接口。
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
