package org.dherhf.preference.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "用户偏好更新请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceUpdateDTO {

    @Schema(description = "偏好影厅类型")
    private String preferredHallType;

    @Schema(description = "最低价格")
    private BigDecimal priceMin;

    @Schema(description = "最高价格")
    private BigDecimal priceMax;

    @Schema(description = "偏好座位区域")
    private String preferredSeatArea;

    @Schema(description = "偏好影片类型列表")
    private List<String> preferredMovieTypes;
}
