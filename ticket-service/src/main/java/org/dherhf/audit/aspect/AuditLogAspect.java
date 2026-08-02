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

/**
 * 审计日志切面,拦截标注了 @AuditLog 的方法,自动记录操作日志。
 * <p>
 * 操作人信息从请求 attribute 中获取（由 AuthInterceptor 注入）。
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

            // 从 RequestAttribute 获取操作人信息
            HttpServletRequest request = ((ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes()).getRequest();

            Long operatorId = (Long) request.getAttribute("userId");
            String operatorType = (String) request.getAttribute("type");

            auditLogService.record(
                    operatorId,
                    operatorType != null ? operatorType : "unknown",
                    operatorType != null ? operatorType : "admin",
                    auditLogAnnotation.action(),
                    auditLogAnnotation.targetType(),
                    targetId,
                    null,
                    null
            );
        } catch (Exception e) {
            log.warn("Failed to capture audit log info", e);
        }

        return result;
    }
}
