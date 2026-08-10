package org.dherhf.agent.model.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发送对话消息请求。
 */
@Data
@Schema(description = "发送对话消息请求")
public class SendMessageRequest {

    /** 用户输入文本 */
    @Schema(description = "用户输入文本")
    @NotBlank(message = "消息内容不能为空")
    @Size(max = 500, message = "单条消息最长 500 字符")
    private String content;

    /** 幂等请求 ID（UUID 格式，前端生成），用于写操作（锁座/支付/取消/退票）的幂等控制 */
    @Schema(description = "幂等请求ID（UUID格式，前端生成），用于写操作（锁座/支付/取消/退票）的幂等控制")
    private String requestId;

    /** 用户当前经度（GCJ-02，由前端高德定位提供） */
    @Schema(description = "用户当前经度（GCJ-02，由前端高德定位提供）")
    private Double longitude;

    /** 用户当前纬度（GCJ-02） */
    @Schema(description = "用户当前纬度（GCJ-02）")
    private Double latitude;

    /** 用户当前城市 */
    @Schema(description = "用户当前城市")
    private String city;
}
