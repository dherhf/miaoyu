package org.dherhf.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Schema(description = "内部锁座请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalLockSeatDTO {

    @Schema(description = "用户ID")
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @Schema(description = "场次ID")
    @NotNull(message = "场次ID不能为空")
    private Long scheduleId;

    @Schema(description = "座位ID列表")
    @NotEmpty(message = "座位ID列表不能为空")
    private List<Long> seatIds;

    @Schema(description = "购票数量")
    @NotNull(message = "购票数量不能为空")
    private Integer ticketCount;

    @Schema(description = "幂等请求ID")
    @NotNull(message = "幂等请求ID不能为空")
    private String requestId;
}
