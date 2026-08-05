package org.dherhf.agent.model.ticket;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 场次行数据（对应 ticket-service 返回字段）。
 */
@Data
public class SessionRow {
    private Long id;
    private String showDate;
    private String startTime;
    private String endTime;
    private String hallName;
    private String languageVersion;
    private BigDecimal price;
    private Integer availableSeats;
}
