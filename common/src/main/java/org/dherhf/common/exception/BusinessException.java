package org.dherhf.common.exception;

import lombok.Getter;

/**
 * 业务异常，用于在 Service 层抛出可预期的业务错误。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
