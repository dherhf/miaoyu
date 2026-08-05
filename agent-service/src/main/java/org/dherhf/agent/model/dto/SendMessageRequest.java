package org.dherhf.agent.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发送对话消息请求。
 */
@Data
public class SendMessageRequest {

    /** 用户输入文本 */
    @NotBlank(message = "消息内容不能为空")
    @Size(max = 500, message = "单条消息最长 500 字符")
    private String content;

    /** 由前端选座直接提供的座位 ID 列表（无需 LLM 提取） */
    private java.util.List<Long> seatIds;

    /** 由前端选场次后直接提供的场次 ID（无需 LLM 提取） */
    private Long scheduleId;

    /** 前端选座时携带的购票数量（=座位数） */
    private Integer ticketCount;

    /** 幂等请求 ID（UUID 格式，前端生成），用于写操作（锁座/支付/取消/退票）的幂等控制 */
    private String requestId;
}
