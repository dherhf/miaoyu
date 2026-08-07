package org.dherhf.agent.enums;

/**
 * 卡片类型枚举，对应 System Prompt 中定义的 card_type。
 */
public enum CardTypeEnum {

    MOVIE_LIST("movie_list"),
    CINEMA_LIST("cinema_list"),
    SESSION_LIST("session_list"),
    SEAT_MAP("seat_map"),
    ORDER_CONFIRM("order_confirm"),
    ORDER_SUCCESS("order_success"),
    RECOMMEND_TIP("recommend_tip"),
    PENDING_ORDER("pending_order"),
    ORDER_LIST("order_list"),
    ROUTE_INFO("route_info"),
    NEARBY_POI("nearby_poi"),
    WEATHER_INFO("weather_info");

    private final String value;

    CardTypeEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CardTypeEnum fromValue(String value) {
        for (CardTypeEnum type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return null;
    }
}
