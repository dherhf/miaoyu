package org.dherhf.schedule.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("schedule_seats")
public class ScheduleSeat {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long scheduleId;

    private Long hallCellId;

    private Integer seatIndex;

    private String status;

    private LocalDateTime lockedAt;

    private Long orderId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
