package org.dherhf.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.result.Result;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import jakarta.validation.ConstraintViolationException;

import java.time.format.DateTimeParseException;

/**
 * 全局异常处理器，统一将各类异常转换为标准 {@link Result} 响应。
 * <p>
 * 业务异常返回业务码；参数类异常统一返回 400；未捕获异常返回 500。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务异常，返回异常中携带的业务码和消息。 */
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

    /** @RequestBody 参数校验失败，提取首个字段错误信息。 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "参数校验失败";
        log.warn("参数校验失败: {}", message);
        return Result.error(400, message);
    }

    /** 日期格式解析失败（如 LocalDate.parse 抛出），提示正确格式。 */
    @ExceptionHandler(DateTimeParseException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleDateTimeParseException(DateTimeParseException e) {
        log.warn("日期格式解析失败: {}", e.getMessage());
        return Result.error(400, "日期格式错误，请使用 YYYY-MM-DD 格式");
    }

    /** 缺少必填 query/form 参数。 */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("缺少必填参数: {}", e.getParameterName());
        return Result.error(400, "缺少必填参数: " + e.getParameterName());
    }

    /** 参数类型不匹配（如 String 传到 Long 参数）。 */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("参数类型不匹配: {}={}", e.getName(), e.getValue());
        return Result.error(400, "参数类型不匹配: " + e.getName());
    }

    /** 请求体 JSON 格式错误或不可读。 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("请求体格式错误: {}", e.getMessage());
        return Result.error(400, "请求体格式错误");
    }

    /** @PathVariable/@RequestParam 约束校验失败（如 @Min、@NotBlank）。 */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(v -> v.getMessage())
                .findFirst()
                .orElse("参数校验失败");
        log.warn("约束校验失败: {}", message);
        return Result.error(400, message);
    }

    /** 兜底：未捕获的异常统一返回 500。 */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<Void> handleException(Exception e) {
        log.error("未知异常", e);
        return Result.error(500, "服务异常");
    }
}
