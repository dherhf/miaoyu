package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "影院列表")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaListVO {

    @Schema(description = "影院ID")
    private Long id;

    @Schema(description = "影院名称")
    private String name;

    @Schema(description = "影院地址")
    private String address;

    @Schema(description = "经度")
    private BigDecimal longitude;

    @Schema(description = "纬度")
    private BigDecimal latitude;

    @Schema(description = "设施列表")
    private List<String> facilities;

    @Schema(description = "评分")
    private BigDecimal rating;

    @Schema(description = "联系电话")
    private String phone;

    @Schema(description = "状态")
    private Integer status;

    @Schema(description = "影厅数量")
    private Integer hallCount;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
}
