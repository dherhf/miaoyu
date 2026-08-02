package org.dherhf.order.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class LockSeatDTO {

    @NotNull(message = "场次ID不能为空")
    private Long scheduleId;

    @NotEmpty(message = "座位ID列表不能为空")
    private List<Long> seatIds;

    @NotNull(message = "购票数量不能为空")
    private Integer ticketCount;
}
