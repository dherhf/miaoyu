package org.dherhf.agent.model.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建对话会话请求。
 */
@Data
public class CreateSessionRequest {

    /** 会话标题，不传时默认"新对话" */
    @Size(max = 50, message = "标题最长 50 字符")
    private String title;
}
