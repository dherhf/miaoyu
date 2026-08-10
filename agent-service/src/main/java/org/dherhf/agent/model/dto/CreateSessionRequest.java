package org.dherhf.agent.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建对话会话请求。
 */
@Data
@Schema(description = "创建对话会话请求")
public class CreateSessionRequest {

    /** 会话标题，不传时默认"新对话" */
    @Schema(description = "会话标题，不传时默认\"新对话\"")
    @Size(max = 50, message = "标题最长 50 字符")
    private String title;
}
