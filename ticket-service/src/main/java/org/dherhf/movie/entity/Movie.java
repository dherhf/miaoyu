package org.dherhf.movie.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 影片实体类，对应数据库 movie 表。
 * <p>
 * 存储影片基本信息，包括名称、类型、海报、评分、时长、上映日期、导演、演员等。
 * 使用 MyBatis-Plus 注解进行 ORM 映射，{@code types} 字段通过 JacksonTypeHandler 存为 JSON。
 * 逻辑删除字段 {@code deleted} 实现软删除。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "movie", autoResultMap = true)
public class Movie {

    /** 主键 ID，雪花算法生成 */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 影片名称 */
    private String name;

    /** 影片类型列表，JSON 存储（如动作、科幻、喜剧） */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> types;

    /** 海报图片在 OSS 中的 objectKey */
    private String posterUrl;

    /** 影片评分 */
    private BigDecimal rating;

    /** 影片时长（分钟） */
    private Integer duration;

    /** 上映日期 */
    private LocalDate releaseDate;

    /** 导演 */
    private String director;

    /** 演员 */
    private String actors;

    /** 影片简介 */
    private String description;

    /** 影片状态：0-下架，1-上架 */
    private Integer status;

    /** 逻辑删除标识：0-未删除，1-已删除 */
    @TableLogic
    private Integer deleted;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
