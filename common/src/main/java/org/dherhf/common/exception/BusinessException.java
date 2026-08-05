package org.dherhf.common.exception;

import lombok.Getter;

/**
 * 业务异常,用于在 Service 层抛出可预期的业务错误。
 * <p>
 * 携带错误码和错误消息,由各服务的全局异常处理器统一捕获并转换为响应。
 */
@Getter
public class BusinessException extends RuntimeException {

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
