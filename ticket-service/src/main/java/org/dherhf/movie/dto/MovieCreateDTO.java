package org.dherhf.movie.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class MovieCreateDTO {

    @NotBlank(message = "影片名称不能为空")
    @Size(min = 1, max = 50, message = "影片名称长度1-50字符")
    private String name;

    @NotEmpty(message = "影片类型不能为空")
    private List<String> types;

    @NotBlank(message = "海报URL不能为空")
    private String posterUrl;

    @NotNull(message = "评分不能为空")
    @DecimalMin(value = "0.0", message = "评分最小0.0")
    @DecimalMax(value = "10.0", message = "评分最大10.0")
    private BigDecimal rating;

    @NotNull(message = "时长不能为空")
    @Min(value = 1, message = "时长最小1分钟")
    @Max(value = 300, message = "时长最大300分钟")
    private Integer duration;

    @NotNull(message = "上映日期不能为空")
    private LocalDate releaseDate;

    @Size(max = 50, message = "导演名称最长50字符")
    private String director;

    @Size(max = 100, message = "主演名称最长100字符")
    private String actors;

    @Size(max = 500, message = "简介最长500字符")
    private String description;
}
