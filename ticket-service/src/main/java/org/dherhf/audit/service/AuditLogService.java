package org.dherhf.audit.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.audit.entity.AuditLog;
import org.dherhf.audit.mapper.AuditLogMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 审计日志服务,异步记录管理员操作。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogMapper auditLogMapper;

    @Async
    public void record(Long operatorId, String operatorName, String operatorType,
                       String action, String targetType, Long targetId,
                       String beforeData, String afterData) {
        try {
            String ip = null;
            String userAgent = null;

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                ip = request.getRemoteAddr();
                userAgent = request.getHeader("User-Agent");
            }

            AuditLog logEntry = AuditLog.builder()
                    .operatorId(operatorId)
                    .operatorName(operatorName)
                    .operatorType(operatorType)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .beforeData(beforeData)
                    .afterData(afterData)
                    .ip(ip)
                    .userAgent(userAgent)
                    .build();

            auditLogMapper.insert(logEntry);
        } catch (Exception e) {
            log.error("Failed to record audit log", e);
        }
    }
}
