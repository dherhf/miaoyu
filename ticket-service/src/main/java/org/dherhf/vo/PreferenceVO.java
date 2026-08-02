package org.dherhf.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PreferenceVO {

    private String preferredHallType;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private String preferredSeatArea;
    private List<String> preferredMovieTypes;
}
