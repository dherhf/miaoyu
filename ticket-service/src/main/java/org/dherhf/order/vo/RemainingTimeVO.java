package org.dherhf.order.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Schema(description = "剩余时间")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemainingTimeVO {

    @Schema(description = "剩余时间（秒）")
    private Integer remainingTime;

    @Schema(description = "过期时间")
    private LocalDateTime expireAt;

    @Schema(description = "是否已过期")
    private Boolean expired;
}
