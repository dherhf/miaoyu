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
public class ScheduleListVO {

    private Long id;
    private Long movieId;
    private String movieName;
    private Long cinemaId;
    private String cinemaName;
    private Long hallId;
    private String hallName;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal price;
    private String languageVersion;
    private Integer totalSeats;
    private Integer availableSeats;
    private Integer soldSeats;
    private Double occupancyRate;
    private String status;
    private LocalDateTime createdAt;
}
