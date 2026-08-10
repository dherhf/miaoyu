package org.dherhf.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "取票码校验请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckTicketDTO {

    @Schema(description = "取票码")
    @NotBlank(message = "取票码不能为空")
    private String pickupCode;
}
