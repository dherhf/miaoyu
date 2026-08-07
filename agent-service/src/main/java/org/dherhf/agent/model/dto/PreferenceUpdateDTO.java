package org.dherhf.agent.model.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreferenceUpdateDTO {

    @Size(max = 50, message = "影厅类型过长")
    private String preferredHallType;

    @DecimalMin(value = "0.0", message = "价格下限不能为负")
    @DecimalMax(value = "9999.99", message = "价格下限超出合理范围")
    private BigDecimal priceMin;

    @DecimalMin(value = "0.0", message = "价格上限不能为负")
    @DecimalMax(value = "9999.99", message = "价格上限超出合理范围")
    private BigDecimal priceMax;

    @Size(max = 50, message = "座位区域描述过长")
    private String preferredSeatArea;

    @Size(max = 5, message = "影片类型最多5个")
    private List<@Size(max = 20, message = "单个影片类型过长") String> preferredMovieTypes;
}
