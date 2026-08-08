package org.dherhf.schedule.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private String languageVersionName;
    private Integer totalSeats;
    private String status;
    private LocalDateTime createdAt;
}
