package org.dherhf.agent.model.ticket;

import lombok.Data;

import java.util.List;

/**
 * 单次请求上下文（对应原 ThreadLocal 中持有的 userId / scheduleId / seatIds / ticketCount / requestId）。
 * 存入 Redis，供 TicketTools 通过 sessionId 查询。
 */
@Data
public class RequestContext {
    private Long userId;
    private Long scheduleId;
    private List<Long> seatIds;
    private Integer ticketCount;
    private String requestId;
}
