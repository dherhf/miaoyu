package org.dherhf.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckTicketDTO {

    @NotBlank(message = "取票码不能为空")
    private String pickupCode;
}
