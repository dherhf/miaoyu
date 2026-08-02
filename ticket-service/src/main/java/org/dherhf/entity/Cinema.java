package org.dherhf.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "cinema", autoResultMap = true)
public class Cinema {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    private String address;

    private BigDecimal longitude;

    private BigDecimal latitude;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> facilities;

    private BigDecimal rating;

    private String phone;

    private Integer status;

    @TableLogic
    private Integer deleted;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
