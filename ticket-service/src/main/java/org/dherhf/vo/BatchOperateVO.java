package org.dherhf.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class BatchOperateVO {

    private List<Long> successIds = new ArrayList<>();
    private List<Long> failIds = new ArrayList<>();
    private Map<String, String> failReasons = new HashMap<>();
}
