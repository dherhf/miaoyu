package org.dherhf.schedule.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class ScheduleVO {

    private Long id;
    private Long movieId;
    private Long cinemaId;
    private Long hallId;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal price;
    private String languageVersion;
    private Integer totalSeats;
    private String status;
    private LocalDateTime createdAt;
}
