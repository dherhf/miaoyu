package org.dherhf.movie.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class MovieListVO {

    private Long id;
    private String name;
    private List<String> types;
    private String posterUrl;
    private BigDecimal rating;
    private Integer duration;
    private LocalDate releaseDate;
    private Integer status;
}
