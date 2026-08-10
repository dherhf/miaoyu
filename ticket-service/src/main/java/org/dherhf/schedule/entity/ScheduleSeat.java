package org.dherhf.schedule.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 场次座位实体类，对应数据库 schedule_seats 表。
 * <p>
 * 表示某场次下每个物理座位的售卖状态，创建场次时根据影厅座位布局批量生成。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("schedule_seats")
public class ScheduleSeat {

    /** 主键ID，自增 */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属场次ID */
    private Long scheduleId;

    /** 影厅座位单元ID，关联 hall_cell 表 */
    private Long hallCellId;

    /** 座位序号，从0开始，用于 Redis Bitmap 索引 */
    private Integer seatIndex;

    /** 座位状态，对应 ScheduleSeatStatus 枚举的 code 值 */
    private String status;

    /** 锁定时间，记录座位被锁定的时间戳 */
    private LocalDateTime lockedAt;

    /** 关联订单ID，座位被锁定或售出时关联的订单 */
    private Long orderId;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
