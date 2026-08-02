package org.dherhf.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("halls")
public class Hall {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cinemaId;

    private String name;

    private String screenType;

    private Integer totalRows;

    private Integer totalCols;

    private Integer status;

    @TableLogic
    private Integer deleted;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
