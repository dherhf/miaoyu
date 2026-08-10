package org.dherhf.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Schema(description = "锁座请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LockSeatDTO {

    @Schema(description = "场次ID")
    @NotNull(message = "场次ID不能为空")
    private Long scheduleId;

    @Schema(description = "座位ID列表")
    @NotEmpty(message = "座位ID列表不能为空")
    private List<Long> seatIds;

    @Schema(description = "购票数量")
    @NotNull(message = "购票数量不能为空")
    private Integer ticketCount;
}
