package org.dherhf.common.exception;

import lombok.Getter;
import org.dherhf.common.result.Result;

/**
 * 业务异常,用于在 Service 层抛出可预期的业务错误。
 * <p>
 * 携带 HTTP 状态码和错误消息,由 {@link GlobalExceptionHandler} 统一捕获并转换为 {@link Result} 响应。
 *
 * @see GlobalExceptionHandler
 */
@Getter
public class BusinessException extends RuntimeException {

    // 业务错误码,对应 HTTP 状态码
    private final int code;

    /**
     * 构造业务异常。
     *
     * @param code    错误码
     * @param message 错误消息
     */
    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
