package org.dherhf.audit.aspect;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.dherhf.common.annotation.AuditLog;
import org.dherhf.audit.service.AuditLogService;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Objects;

/**
 * 审计日志切面,拦截标注了 @AuditLog 的方法,自动记录操作日志。
 * <p>
 * 操作人信息从请求 Header 中获取（由 Gateway 注入 X-User-Id / X-User-Type）。
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditLogAspect {

    private final AuditLogService auditLogService;

    @Around("@annotation(auditLogAnnotation)")
    public Object around(ProceedingJoinPoint joinPoint, AuditLog auditLogAnnotation) throws Throwable {
        Object result = joinPoint.proceed();

        try {
            // 从方法参数中推断 targetId（第一个 Long 类型参数）
            Long targetId = null;
            for (Object arg : joinPoint.getArgs()) {
                if (arg instanceof Long) {
                    targetId = (Long) arg;
                    break;
                }
            }

            // 从请求 Header 获取操作人信息（由 Gateway 注入）
            // ip / userAgent 必须在请求线程中提取，@Async 线程无法读取 RequestContextHolder
            HttpServletRequest request = ((ServletRequestAttributes)
                    Objects.requireNonNull(RequestContextHolder.getRequestAttributes())).getRequest();

            String userIdHeader = request.getHeader("X-User-Id");
            Long operatorId = userIdHeader != null ? Long.valueOf(userIdHeader) : null;
            String operatorType = request.getHeader("X-User-Type");

            auditLogService.record(
                    operatorId,
                    operatorType != null ? operatorType : "admin",
                    auditLogAnnotation.action(),
                    auditLogAnnotation.targetType(),
                    targetId,
                    request.getRemoteAddr(),
                    request.getHeader("User-Agent")
            );
        } catch (Exception e) {
            log.warn("Failed to capture audit log info", e);
        }

        return result;
    }
}
