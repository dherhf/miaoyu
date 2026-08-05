package org.dherhf.common.result;

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

    /**
     * 构建成功响应,不携带数据。
     *
     * @param <T> 数据类型
     * @return 成功响应
     */
    public static <T> Result<T> success() {
        return success(null);
    }

    /**
     * 构建成功响应,携带数据。
     *
     * @param data 响应数据
     * @param <T>  数据类型
     * @return 成功响应
     */
    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.code = ErrorCodeEnum.SUCCESS.getCode();
        r.message = ErrorCodeEnum.SUCCESS.getMessage();
        r.data = data;
        return r;
    }

    /**
     * 构建错误响应,使用预定义错误码。
     *
     * @param errorCode 错误码枚举
     * @param <T>       数据类型
     * @return 错误响应
     */
    public static <T> Result<T> error(ErrorCodeEnum errorCode) {
        Result<T> r = new Result<>();
        r.code = errorCode.getCode();
        r.message = errorCode.getMessage();
        return r;
    }

    /**
     * 构建错误响应,使用预定义错误码并自定义消息。
     *
     * @param errorCode 错误码枚举
     * @param message   自定义错误消息
     * @param <T>       数据类型
     * @return 错误响应
     */
    public static <T> Result<T> error(ErrorCodeEnum errorCode, String message) {
        Result<T> r = new Result<>();
        r.code = errorCode.getCode();
        r.message = message;
        return r;
    }

    /**
     * 构建错误响应。
     *
     * @param code    错误码
     * @param message 错误消息
     * @param <T>     数据类型
     * @return 错误响应
     */
    public static <T> Result<T> error(int code, String message) {
        Result<T> r = new Result<>();
        r.code = code;
        r.message = message;
        return r;
    }
}
