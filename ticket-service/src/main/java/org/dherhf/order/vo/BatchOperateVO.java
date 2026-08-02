package org.dherhf.order.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchOperateVO {

    @Builder.Default
    private List<Long> successIds = new ArrayList<>();
    @Builder.Default
    private List<Long> failIds = new ArrayList<>();
    @Builder.Default
    private Map<String, String> failReasons = new HashMap<>();
}
