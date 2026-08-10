package org.dherhf.movie.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "影片更新请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieUpdateDTO {

    @Schema(description = "影片名称")
    @NotBlank(message = "影片名称不能为空")
    @Size(min = 1, max = 50, message = "影片名称长度1-50字符")
    private String name;

    @Schema(description = "影片类型列表")
    @NotEmpty(message = "影片类型不能为空")
    private List<String> types;

    @Schema(description = "海报URL")
    @NotBlank(message = "海报URL不能为空")
    private String posterUrl;

    @Schema(description = "评分")
    @NotNull(message = "评分不能为空")
    @DecimalMin(value = "0.0", message = "评分最小0.0")
    @DecimalMax(value = "10.0", message = "评分最大10.0")
    private BigDecimal rating;

    @Schema(description = "影片时长(分钟)")
    @NotNull(message = "时长不能为空")
    @Min(value = 1, message = "时长最小1分钟")
    @Max(value = 300, message = "时长最大300分钟")
    private Integer duration;

    @Schema(description = "上映日期")
    @NotNull(message = "上映日期不能为空")
    private LocalDate releaseDate;

    @Schema(description = "导演")
    @Size(max = 50, message = "导演名称最长50字符")
    private String director;

    @Schema(description = "主演")
    @Size(max = 100, message = "主演名称最长100字符")
    private String actors;

    @Schema(description = "影片简介")
    @Size(max = 500, message = "简介最长500字符")
    private String description;
}
