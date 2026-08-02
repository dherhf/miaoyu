package org.dherhf.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "user_preference", autoResultMap = true)
public class UserPreference {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String preferredHallType;

    private BigDecimal priceMin;

    private BigDecimal priceMax;

    private String preferredSeatArea;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> preferredMovieTypes;

    private LocalDateTime updatedAt;
}
