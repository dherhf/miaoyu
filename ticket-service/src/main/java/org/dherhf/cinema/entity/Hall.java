package org.dherhf.cinema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 影厅实体,映射 {@code halls} 表。
 * <p>
 * 影厅 ID 使用数据库自增,归属于某个影院,描述影厅的基本信息及座位布局行列数,
 * 支持逻辑删除。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("halls")
public class Hall {

    /** 影厅 ID（数据库自增） */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属影院 ID */
    private Long cinemaId;

    /** 影厅名称 */
    private String name;

    /** 银幕类型,如 IMAX、杜比、普通等 */
    private String screenType;

    /** 座位布局总行数 */
    private Integer totalRows;

    /** 座位布局总列数 */
    private Integer totalCols;

    /** 状态：1-启用,0-未启用 */
    private Integer status;

    /** 逻辑删除标记：0-未删除,1-已删除 */
    @TableLogic
    private Integer deleted;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}