package org.dherhf.preference.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
