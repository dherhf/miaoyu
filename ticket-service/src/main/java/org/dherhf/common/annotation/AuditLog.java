package org.dherhf.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 审计日志注解,标记需要记录操作日志的方法。
 * <p>
 * 配合 {@link org.dherhf.audit.aspect.AuditLogAspect} 切面使用，
 * 标注在 Controller 方法上后，方法执行成功会自动记录审计日志。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {

    /**
     * 操作类型，如 CREATE / UPDATE / PUBLISH / UNPUBLISH 等。
     */
    String action();

    /**
     * 操作目标类型，如 movie / order 等。
     */
    String targetType();

    /**
     * 操作描述，可选的补充说明。
     */
    String description() default "";
}