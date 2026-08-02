package org.dherhf.preference.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceVO {

    private String preferredHallType;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private String preferredSeatArea;
    private List<String> preferredMovieTypes;
}
