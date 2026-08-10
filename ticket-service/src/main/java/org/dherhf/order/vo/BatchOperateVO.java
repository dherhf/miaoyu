package org.dherhf.order.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Schema(description = "批量操作结果")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchOperateVO {

    @Builder.Default
    @Schema(description = "成功的ID列表")
    private List<Long> successIds = new ArrayList<>();

    @Builder.Default
    @Schema(description = "失败的ID列表")
    private List<Long> failIds = new ArrayList<>();

    @Builder.Default
    @Schema(description = "失败原因映射")
    private Map<String, String> failReasons = new HashMap<>();
}
