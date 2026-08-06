package org.dherhf.agent.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * 高德地图代理客户端，通过 WeaveFox 代理调用高德 API。
 * <p>
 * 代理地址: https://www.weavefox.cn/api/v1/amap
 * 返回原始 JSON 字符串，不做解析，交给 LLM 理解。
 * </p>
 */
@Slf4j
@Component
public class AmapClient {

    private final RestClient restClient;
    private final String basePath;
    private final String token;

    public AmapClient(
            @Value("${amap.endpoint}") String endpoint,
            @Value("${amap.base-path}") String basePath,
            @Value("${amap.token}") String token
    ) {
        this.basePath = basePath;
        this.token = token;
        this.restClient = RestClient.builder()
                .baseUrl(endpoint)
                .defaultHeader("Authorization", "Bearer " + token)
                .build();
    }

    /**
     * 路径规划。
     *
     * @param origin      出发地坐标（经纬度，逗号分隔，如 "112.94,28.23"）
     * @param destination 目的地坐标
     * @param mode        出行方式：driving / transit / walking
     * @param city        公交规划时的城市名（仅 transit 模式需要）
     * @return 原始 JSON 字符串
     */
    public String getRoute(String origin, String destination, String mode, String city) {
        String path = switch (mode) {
            case "transit" -> "/route/transit";
            case "walking" -> "/route/walking";
            default -> "/route/driving";
        };
        try {
            var builder = restClient.get()
                    .uri(basePath + path + "?origin={origin}&destination={destination}",
                            Map.of("origin", origin, "destination", destination));
            if ("transit".equals(mode) && city != null && !city.isBlank()) {
                builder = restClient.get()
                        .uri(basePath + path + "?origin={origin}&destination={destination}&city={city}",
                                Map.of("origin", origin, "destination", destination, "city", city));
            }
            return builder.retrieve().body(String.class);
        } catch (Exception e) {
            log.warn("[AmapClient] 路径规划失败: mode={}, origin={}, dest={}, err={}", mode, origin, destination, e.getMessage());
            return "{\"code\":500,\"message\":\"路径规划失败：" + e.getMessage() + "\"}";
        }
    }

    /**
     * 周边 POI 搜索。
     *
     * @param location 中心点坐标（经纬度，逗号分隔）
     * @param keywords 搜索关键词（如 "餐厅"、"停车场"）
     * @param radius   搜索半径（米），默认 1000
     * @return 原始 JSON 字符串
     */
    public String searchNearby(String location, String keywords, int radius) {
        try {
            return restClient.get()
                    .uri(basePath + "/poi/around?location={location}&keywords={keywords}&radius={radius}",
                            Map.of("location", location,
                                    "keywords", keywords != null ? keywords : "",
                                    "radius", String.valueOf(radius)))
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("[AmapClient] 周边搜索失败: location={}, keywords={}, err={}", location, keywords, e.getMessage());
            return "{\"code\":500,\"message\":\"周边搜索失败：" + e.getMessage() + "\"}";
        }
    }

    /**
     * 天气查询。
     *
     * @param city 城市名称或编码
     * @return 原始 JSON 字符串
     */
    public String getWeather(String city) {
        try {
            return restClient.get()
                    .uri(basePath + "/weather?city={city}&extensions=base",
                            Map.of("city", city))
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("[AmapClient] 天气查询失败: city={}, err={}", city, e.getMessage());
            return "{\"code\":500,\"message\":\"天气查询失败：" + e.getMessage() + "\"}";
        }
    }

    /**
     * 地理编码（地址转坐标）。
     *
     * @param address 地址（如 "湖南大学"）
     * @param city     城市名（可选，提高精度）
     * @return 原始 JSON 字符串
     */
    public String geocode(String address, String city) {
        try {
            return restClient.get()
                    .uri(basePath + "/geocode?address={address}&city={city}",
                            Map.of("address", address,
                                    "city", city != null ? city : ""))
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("[AmapClient] 地理编码失败: address={}, err={}", address, e.getMessage());
            return "{\"code\":500,\"message\":\"地理编码失败：" + e.getMessage() + "\"}";
        }
    }
}
