package org.dherhf.agent.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PreferenceVO {
    private String preferredHallType;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private String preferredSeatArea;
    private List<String> preferredMovieTypes;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
