package org.dherhf.agent.common;

import lombok.Getter;

/**
 * 全局错误码枚举。
 */
@Getter
public enum ErrorCodeEnum {

    SUCCESS(0, "success"),

    // 4xx 客户端错误
    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "无权访问"),
    NOT_FOUND(404, "资源不存在"),
    SESSION_ENDED(40001, "会话已结束，请开始新对话"),
    SESSION_NOT_FOUND(40002, "会话不存在"),
    INPUT_VIOLATION(40003, "输入内容存在风险，请重新描述您的需求"),
    PARAM_INVALID(40004, "参数校验失败"),

    // 5xx 服务端错误
    INTERNAL_ERROR(500, "服务异常，请稍后重试"),
    LLM_TIMEOUT(50001, "AI 响应超时，请重试"),
    LLM_ERROR(50002, "AI 服务异常"),
    TOOL_ERROR(50003, "工具调用失败"),
    SSE_ERROR(50004, "SSE 连接异常");

    private final int code;
    private final String message;

    ErrorCodeEnum(int code, String message) {
        this.code = code;
        this.message = message;
    }

}
