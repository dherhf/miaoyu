package org.dherhf.cinema.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Schema(description = "影院创建请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaCreateDTO {

    @Schema(description = "影院名称")
    @NotBlank(message = "影院名称不能为空")
    @Size(min = 1, max = 50, message = "影院名称长度1-50字符")
    private String name;

    @Schema(description = "影院地址")
    @NotBlank(message = "影院地址不能为空")
    @Size(min = 1, max = 200, message = "影院地址长度1-200字符")
    private String address;

    @Schema(description = "经度")
    @NotNull(message = "经度不能为空")
    private BigDecimal longitude;

    @Schema(description = "纬度")
    @NotNull(message = "纬度不能为空")
    private BigDecimal latitude;

    @Schema(description = "影院设施列表")
    private List<String> facilities;

    @Schema(description = "影院评分")
    private BigDecimal rating;

    @Schema(description = "影院联系电话")
    private String phone;
}
