package org.dherhf.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.entity.Admin;

/**
 * 管理员表 Mapper 接口。
 */
@Mapper
public interface AdminMapper extends BaseMapper<Admin> {
}
