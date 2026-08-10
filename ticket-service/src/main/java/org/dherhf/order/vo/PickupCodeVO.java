package org.dherhf.order.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "取票码")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PickupCodeVO {

    @Schema(description = "取票码")
    private String pickupCode;

    @Schema(description = "有效时长（秒）")
    private Integer expiresIn;
}
