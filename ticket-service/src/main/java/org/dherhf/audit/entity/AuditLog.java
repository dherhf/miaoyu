package org.dherhf.audit.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 审计日志实体类，对应数据库 audit_log 表。
 * <p>
 * 记录管理员对系统资源的操作行为，包括操作人、操作类型、目标对象和操作前后数据快照。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("audit_log")
public class AuditLog {

    /** 主键 ID，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 操作人 ID */
    private Long operatorId;

    /** 操作人名称 */
    private String operatorName;

    /** 操作人类型（如 admin、agent） */
    private String operatorType;

    /** 操作类型（如 CREATE、UPDATE、PUBLISH） */
    private String action;

    /** 操作目标类型（如 movie、order） */
    private String targetType;

    /** 操作目标 ID */
    private Long targetId;

    /** 操作前数据快照（JSON） */
    private String beforeData;

    /** 操作后数据快照（JSON） */
    private String afterData;

    /** 操作者 IP 地址 */
    private String ip;

    /** 操作者 User-Agent */
    private String userAgent;

    /** 创建时间 */
    private LocalDateTime createdAt;
}