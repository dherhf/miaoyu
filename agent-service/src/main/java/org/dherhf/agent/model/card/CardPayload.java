package org.dherhf.agent.model.card;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 卡片统一外层包装。
 * <pre>
 * { "cardType": "movie_list", "cardData": {...} }
 * </pre>
 * 工具方法返回此对象，上层 Service 据此推送 SSE card 事件并持久化到消息文档。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardPayload {

    /** 卡片类型，参见 CardTypeEnum */
    private String cardType;

    /** 卡片数据（因 cardType 而异） */
    private Object cardData;

    // ---- 工厂方法 ----

    public static CardPayload movieList(List<MovieCard> movies) {
        return CardPayload.builder()
                .cardType("movie_list")
                .cardData(Map.of("movies", movies))
                .build();
    }

    public static CardPayload cinemaList(List<CinemaCard> cinemas) {
        return CardPayload.builder()
                .cardType("cinema_list")
                .cardData(Map.of("cinemas", cinemas))
                .build();
    }

    public static CardPayload sessionList(List<SessionCard> sessions) {
        return CardPayload.builder()
                .cardType("session_list")
                .cardData(Map.of("sessions", sessions))
                .build();
    }

    // ---- 各卡片数据结构 ----

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovieCard {
        private Long id;
        private String name;
        private String posterUrl;
        private BigDecimal rating;
        private String[] types;
        private Integer duration;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CinemaCard {
        private Long id;
        private String name;
        private String address;
        private Long distance;
        private String[] facilities;
        private BigDecimal rating;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionCard {
        private Long id;
        private String showDate;
        private String startTime;
        private String endTime;
        private String hallName;
        private String languageVersion;
        private BigDecimal price;
        private Integer availableSeats;
    }
}
