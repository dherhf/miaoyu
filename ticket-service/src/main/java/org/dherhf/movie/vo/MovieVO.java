package org.dherhf.movie.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieVO {

    private Long id;
    private String name;
    private List<String> types;
    private String posterUrl;
    private BigDecimal rating;
    private Integer duration;
    private LocalDate releaseDate;
    private String director;
    private String actors;
    private String description;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
