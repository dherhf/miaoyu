package org.dherhf.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PreferenceUpdateDTO {

    private String preferredHallType;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private String preferredSeatArea;
    private List<String> preferredMovieTypes;
}
