package org.dherhf.cinema.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CinemaUserListVO {

    private Long id;
    private String name;
    private String address;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private List<String> facilities;
    private BigDecimal rating;
    private Long distance;
    private Integer status;
}
