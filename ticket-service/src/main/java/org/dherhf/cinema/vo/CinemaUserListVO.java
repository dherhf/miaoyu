package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "用户端影院列表")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaUserListVO {

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

    @Schema(description = "距离（米）")
    private Long distance;

    @Schema(description = "状态")
    private Integer status;
}
