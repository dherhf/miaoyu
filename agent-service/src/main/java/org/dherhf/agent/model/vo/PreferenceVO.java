package org.dherhf.agent.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "用户偏好信息")
public class PreferenceVO {

    @Schema(description = "偏好影厅类型")
    private String preferredHallType;

    @Schema(description = "价格下限")
    private BigDecimal priceMin;

    @Schema(description = "价格上限")
    private BigDecimal priceMax;

    @Schema(description = "偏好座位区域")
    private String preferredSeatArea;

    @Schema(description = "偏好影片类型列表")
    private List<String> preferredMovieTypes;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
