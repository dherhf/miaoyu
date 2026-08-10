package org.dherhf.audit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.audit.entity.AuditLog;

/**
 * 审计日志 Mapper 接口，继承 MyBatis-Plus BaseMapper，提供审计日志的 CRUD 数据库操作。
 */
@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLog> {
}