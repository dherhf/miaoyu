package org.dherhf.agent.enums;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * 用户意图分类。
 * <p>
 * 对应 System Prompt 中的意图定义，LLM 输出 intent 字段需匹配此枚举。
 * <br>中英文映射统一由枚举维护，提示词动态生成。
 * </p>
 */
public enum IntentEnum {

    /** 购票意图：用户想买票/订票/选座 */
    BUY_TICKET("用户想买票/订票/选座"),

    /** 修改意图：用户对已推荐结果表达不满，要求调整（太贵/太远/换一个） */
    MODIFY("用户对已推荐结果表达不满，要求调整（如\"太贵了\"、\"换便宜点的\"、\"太远了\"）"),

    /** 查询订单：用户查看自己的历史/待支付订单 */
    QUERY_ORDER("用户查看自己的历史/待支付订单"),

    /** 模糊推荐：用户表达模糊偏好（如"想看个喜剧"），需按类型推荐 */
    FUZZY_RECOMMEND("用户表达模糊偏好（如\"想看个喜剧\"、\"周末看什么\"），需按类型推荐而非要求精确片名"),

    /** 行程规划：用户问出行路线/周边设施/天气等 */
    TRIP_PLAN("用户问出行路线、周边设施（如餐厅/停车场）、天气等行程规划"),

    /** 其他：闲聊/超出业务范围 */
    OTHER("闲聊或超出业务范围");

    private final String descriptionZh;

    IntentEnum(String descriptionZh) {
        this.descriptionZh = descriptionZh;
    }

    /**
     * 生成提示词中的意图分类列表（格式：- INTENT_NAME：中文描述）。
     */
    public static String toPromptList() {
        return Arrays.stream(values())
                .map(e -> "- " + e.name() + "：" + e.descriptionZh)
                .collect(Collectors.joining("\n"));
    }
}
