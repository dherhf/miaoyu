package org.dherhf.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.entity.AuditLog;
import org.dherhf.mapper.AuditLogMapper;
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
            AuditLog logEntry = new AuditLog();
            logEntry.setOperatorId(operatorId);
            logEntry.setOperatorName(operatorName);
            logEntry.setOperatorType(operatorType);
            logEntry.setAction(action);
            logEntry.setTargetType(targetType);
            logEntry.setTargetId(targetId);
            logEntry.setBeforeData(beforeData);
            logEntry.setAfterData(afterData);

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                logEntry.setIp(request.getRemoteAddr());
                logEntry.setUserAgent(request.getHeader("User-Agent"));
            }

            auditLogMapper.insert(logEntry);
        } catch (Exception e) {
            log.error("Failed to record audit log", e);
        }
    }
}
