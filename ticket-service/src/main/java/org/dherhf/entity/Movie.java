package org.dherhf.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "movie", autoResultMap = true)
public class Movie {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String name;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> types;

    private String posterUrl;

    private BigDecimal rating;

    private Integer duration;

    private LocalDate releaseDate;

    private String director;

    private String actors;

    private String description;

    private Integer status;

    @TableLogic
    private Integer deleted;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
