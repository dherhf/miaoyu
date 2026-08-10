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
 * <p>
 * 通过 {@code @Async} 异步执行，避免审计记录影响主流程性能。
 * 从当前请求上下文获取 IP 和 User-Agent 信息。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogMapper auditLogMapper;

    /**
     * 异步记录审计日志。
     * <p>
     * 从当前请求上下文获取 IP 和 User-Agent，构建审计日志实体并插入数据库。
     * 异常仅记录日志不影响主流程。
     *
     * @param operatorId   操作人 ID
     * @param operatorName  操作人名称
     * @param operatorType  操作人类型
     * @param action        操作类型（CREATE/UPDATE/PUBLISH 等）
     * @param targetType    操作目标类型（movie/order 等）
     * @param targetId      操作目标 ID
     * @param beforeData    操作前数据快照
     * @param afterData     操作后数据快照
     */
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