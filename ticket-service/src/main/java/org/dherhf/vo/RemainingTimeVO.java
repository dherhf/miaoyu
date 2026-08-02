package org.dherhf.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RemainingTimeVO {

    private Integer remainingTime;
    private LocalDateTime expireAt;
    private Boolean expired;
}
