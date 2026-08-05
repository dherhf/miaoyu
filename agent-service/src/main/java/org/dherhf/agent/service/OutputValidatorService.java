package org.dherhf.agent.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.dherhf.agent.enums.SlotEnum;

import java.util.Set;

/**
 * LLM 输出校验（Prompt 注入防护第三层）。
 * <p>
 * 检查 LLM 返回内容是否包含系统提示泄露、越权指令等。
 * </p>
 */
@Slf4j
@Service
public class OutputValidatorService {

    // 输出黑名单：LLM 回复中不应出现的标记（基于 SlotEnum 动态生成 + 固定标记）
    private static final Set<String> FORBIDDEN_OUTPUT_MARKERS;

    static {
        var set = new java.util.HashSet<String>();
        // 槽位定义标记
        set.add("## 槽位定义");
        // 意图分类标记
        set.add("## 意图分类");
        // 角色标记
        set.add("## 角色");
        // 所有槽位 key（中英文均加入，防止 LLM 输出槽位名）
        for (SlotEnum slot : SlotEnum.values()) {
            set.add(slot.getKey());
            set.add(slot.getDescriptionZh());
        }
        FORBIDDEN_OUTPUT_MARKERS = Set.copyOf(set);
    }

    /**
     * 校验 LLM 输出是否合规。
     *
     * @param output LLM 输出文本
     * @return true=合规，false=检测到泄露
     */
    public boolean validate(String output) {
        if (output == null || output.isBlank()) {
            return true;
        }
        String lower = output.toLowerCase();
        for (String marker : FORBIDDEN_OUTPUT_MARKERS) {
            if (lower.contains(marker.toLowerCase())) {
                log.warn("[OutputValidator] 检测到系统提示泄露: {}", output);
                return false;
            }
        }
        return true;
    }
}
