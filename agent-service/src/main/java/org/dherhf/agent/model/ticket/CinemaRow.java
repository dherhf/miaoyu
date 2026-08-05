package org.dherhf.agent.model.ticket;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 影院行数据（对应 ticket-service 返回字段）。
 */
@Data
public class CinemaRow {
    private Long id;
    private String name;
    private String address;
    private Long distance;
    private String[] facilities;
    private BigDecimal rating;
}
