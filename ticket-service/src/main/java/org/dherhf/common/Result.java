package org.dherhf.common;

import lombok.Data;

@Data
public class Result<T> {

    // 业务状态码,0 表示成功
    private int code;

    // 响应消息
    private String message;

    // 响应数据
    private T data;

    private Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /**
     * 构建成功响应,携带数据。
     *
     * @param data 响应数据
     * @param <T>  数据类型
     * @return 成功响应
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(0, "success", data);
    }

    /**
     * 构建成功响应,不携带数据。
     *
     * @param <T> 数据类型
     * @return 成功响应
     */
    public static <T> Result<T> success() {
        return new Result<>(0, "success", null);
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
        return new Result<>(code, message, null);
    }
}
