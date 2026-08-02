package org.dherhf.order.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemainingTimeVO {

    private Integer remainingTime;
    private LocalDateTime expireAt;
    private Boolean expired;
}
