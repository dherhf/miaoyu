package org.dherhf.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Schema(description = "批量ID请求 DTO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchIdsDTO {

    @Schema(description = "ID列表")
    private List<Long> ids;
}
