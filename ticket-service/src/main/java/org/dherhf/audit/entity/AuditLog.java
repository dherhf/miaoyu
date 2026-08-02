package org.dherhf.audit.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("audit_log")
public class AuditLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long operatorId;

    private String operatorName;

    private String operatorType;

    private String action;

    private String targetType;

    private Long targetId;

    private String beforeData;

    private String afterData;

    private String ip;

    private String userAgent;

    private LocalDateTime createdAt;
}
