package org.dherhf.cinema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 影厅座位格子实体,映射 {@code hall_cells} 表。
 * <p>
 * 每个格子代表影厅座位布局中的一个单元格,可为座位或过道,
 * 通过行列索引唯一标识其在布局中的位置。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("hall_cells")
public class HallCell {

    /** 座位格子 ID（数据库自增） */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属影厅 ID */
    private Long hallId;

    /** 行索引（从 0 开始） */
    private Integer rowIndex;

    /** 列索引（从 0 开始） */
    private Integer colIndex;

    /** 格子类型：seat-座位,aisle-过道/空地 */
    private String cellType;

    /** 座位标签,如 A1、B2 等 */
    private String seatLabel;

    /** 座位分类,如普通、VIP 等 */
    private String seatCategory;

    /** 状态 */
    private String status;

    /** 创建时间 */
    private LocalDateTime createdAt;
}