package org.dherhf.schedule.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class ScheduleDetailVO {

    private Long id;
    private Long movieId;
    private String movieName;
    private String moviePosterUrl;
    private Integer movieDuration;
    private Long cinemaId;
    private String cinemaName;
    private String cinemaAddress;
    private Long hallId;
    private String hallName;
    private String hallScreenType;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal price;
    private String languageVersion;
    private Integer totalSeats;
    private Integer availableSeats;
    private Integer soldSeats;
    private Integer lockedSeats;
    private Double occupancyRate;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
