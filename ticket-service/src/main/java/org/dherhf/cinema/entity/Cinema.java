package org.dherhf.cinema.entity;

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
import java.time.LocalDateTime;
import java.util.List;

/**
 * 影院实体,映射 {@code cinema} 表。
 * <p>
 * 影院 ID 使用雪花算法生成,设施字段通过 {@link JacksonTypeHandler} JSON 序列化存储,
 * 支持逻辑删除。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "cinema", autoResultMap = true)
public class Cinema {

    /** 影院 ID（雪花算法生成） */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 影院名称 */
    private String name;

    /** 影院地址 */
    private String address;

    /** 经度 */
    private BigDecimal longitude;

    /** 纬度 */
    private BigDecimal latitude;

    /** 设施列表（如 IMAX、杜比等）,以 JSON 形式存储 */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> facilities;

    /** 评分 */
    private BigDecimal rating;

    /** 联系电话 */
    private String phone;

    /** 状态：1-营业,0-停业 */
    private Integer status;

    /** 逻辑删除标记：0-未删除,1-已删除 */
    @TableLogic
    private Integer deleted;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}