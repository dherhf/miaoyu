package org.dherhf.agent.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 统一响应封装。
 *
 * @param <T> data 泛型
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    private Result() {
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.code = ErrorCodeEnum.SUCCESS.getCode();
        r.message = ErrorCodeEnum.SUCCESS.getMessage();
        r.data = data;
        return r;
    }

    public static <T> Result<T> error(ErrorCodeEnum errorCode) {
        Result<T> r = new Result<>();
        r.code = errorCode.getCode();
        r.message = errorCode.getMessage();
        return r;
    }

    public static <T> Result<T> error(ErrorCodeEnum errorCode, String message) {
        Result<T> r = new Result<>();
        r.code = errorCode.getCode();
        r.message = message;
        return r;
    }

    public static <T> Result<T> error(int code, String message) {
        Result<T> r = new Result<>();
        r.code = code;
        r.message = message;
        return r;
    }
}
