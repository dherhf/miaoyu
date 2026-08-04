package org.dherhf.agent.enums;

/**
 * 用户意图分类。
 * <p>
 * 对应 System Prompt 中的意图定义，LLM 输出 intent 字段需匹配此枚举。
 * </p>
 */
public enum IntentEnum {

    /** 购票意图：用户想买票/订票/选座 */
    BUY_TICKET,

    /** 修改意图：用户对已推荐结果表达不满，要求调整（太贵/太远/换一个） */
    MODIFY,

    /** 查询订单：用户查看自己的历史/待支付订单 */
    QUERY_ORDER,

    /** 模糊推荐：用户表达模糊偏好（如"想看个喜剧"），需按类型推荐 */
    FUZZY_RECOMMEND,

    /** 其他：闲聊/超出业务范围 */
    OTHER,
}
