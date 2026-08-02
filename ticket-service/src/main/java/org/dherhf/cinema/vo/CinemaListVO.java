package org.dherhf.cinema.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CinemaListVO {

    private Long id;
    private String name;
    private String address;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private List<String> facilities;
    private BigDecimal rating;
    private String phone;
    private Integer status;
    private Integer hallCount;
    private LocalDateTime createdAt;
}
