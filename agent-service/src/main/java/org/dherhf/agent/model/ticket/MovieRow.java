package org.dherhf.agent.model.ticket;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 影片行数据（对应 ticket-service 返回字段）。
 */
@Data
public class MovieRow {
    private Long id;
    private String name;
    private String posterUrl;
    private BigDecimal rating;
    private String[] types;
    private Integer duration;
    private String releaseDate;
}
