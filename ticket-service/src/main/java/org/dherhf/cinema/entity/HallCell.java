package org.dherhf.cinema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("hall_cells")
public class HallCell {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long hallId;

    private Integer rowIndex;

    private Integer colIndex;

    private String cellType;

    private String seatLabel;

    private String seatCategory;

    private String status;

    private LocalDateTime createdAt;
}
