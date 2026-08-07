package org.dherhf.agent.document;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户偏好文档（MongoDB user_preferences 集合）。
 * <p>
 * 偏好数据由用户主动设置，对话时注入 LLM 上下文实现个性化推荐。
 * </p>
 */
@Data
@Document(collection = "user_preferences")
public class UserPreferenceDocument implements Serializable {

    @Id
    @JsonIgnore
    private String id;

    @Indexed(unique = true)
    @JsonIgnore
    private Long userId;

    private String preferredHallType;
    private BigDecimal priceMin;
    private BigDecimal priceMax;
    private String preferredSeatArea;
    private List<String> preferredMovieTypes;

    @LastModifiedDate
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
