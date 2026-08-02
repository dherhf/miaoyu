package org.dherhf.order.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalLockSeatDTO {

    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @NotNull(message = "场次ID不能为空")
    private Long scheduleId;

    @NotEmpty(message = "座位ID列表不能为空")
    private List<Long> seatIds;

    @NotNull(message = "购票数量不能为空")
    private Integer ticketCount;

    @NotNull(message = "幂等请求ID不能为空")
    private String requestId;
}
