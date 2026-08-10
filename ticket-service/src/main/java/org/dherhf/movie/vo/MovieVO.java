package org.dherhf.movie.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "电影信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieVO {

    @Schema(description = "电影ID")
    private Long id;

    @Schema(description = "电影名称")
    private String name;

    @Schema(description = "电影类型列表")
    private List<String> types;

    @Schema(description = "海报URL")
    private String posterUrl;

    @Schema(description = "评分")
    private BigDecimal rating;

    @Schema(description = "时长（分钟）")
    private Integer duration;

    @Schema(description = "上映日期")
    private LocalDate releaseDate;

    @Schema(description = "导演")
    private String director;

    @Schema(description = "演员")
    private String actors;

    @Schema(description = "剧情简介")
    private String description;

    @Schema(description = "状态")
    private Integer status;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
