package org.dherhf.agent.model.card;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 卡片统一外层包装。
 * <pre>
 * { "cardType": "movie_list", "cardData": {...} }
 * </pre>
 * 工具方法缓冲此对象供 DialogueService 推送 SSE card 事件，
 * cardData 为后端返回的原始数据，格式化由 LLM 完成。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardPayload {

    /** 卡片类型，参见 CardTypeEnum */
    private String cardType;

    /** 卡片数据（后端原始数据，因 cardType 而异） */
    private Object cardData;
}
