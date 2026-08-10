package org.dherhf.agent.feign;

import org.dherhf.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * ticket-service 内部接口 Feign 客户端。
 * <p>
 * 对应 ticket-service 的 4 个 InternalController：
 * InternalMovieController、InternalCinemaController、InternalScheduleController、InternalOrderController。
 * </p>
 */
@FeignClient(name = "ticket-service", url = "${ticket-service.base-url}")
public interface TicketFeignClient {

    // ========== 影片 ==========

    /**
     * 搜索影片列表（支持按关键字、类型、影院筛选）。
     *
     * @param keyword  影片名称关键字（可选）
     * @param type     影片类型（可选，如"喜剧"、"动作"）
     * @param cinemaId 影院 ID（可选，筛选该影院有排片的影片）
     * @return 影片列表查询结果
     */
    @GetMapping("/internal/movies")
    Result<Object> searchMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long cinemaId
    );

    // ========== 影院 ==========

    /**
     * 搜索影院列表（支持按影片 ID、关键字、设施筛选）。
     *
     * @param movieId     影片 ID（可选，筛选有该片排片的影院）
     * @param keyword     影院名称关键字（可选）
     * @param facilities  设施要求（可选，如"IMAX"、"杜比"）
     * @return 影院列表查询结果
     */
    @GetMapping("/internal/cinemas")
    Result<Object> searchCinemas(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String facilities
    );

    // ========== 场次 ==========

    /**
     * 搜索场次列表（按影片、影院、日期筛选）。
     *
     * @param movieId  影片 ID（可选）
     * @param cinemaId 影院 ID（可选）
     * @param date     放映日期（可选，格式 yyyy-MM-dd）
     * @return 场次列表查询结果
     */
    @GetMapping("/internal/sessions")
    Result<Object> searchSessions(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String date
    );

    /**
     * 获取指定场次的座位图。
     *
     * @param sessionId 场次 ID
     * @return 座位图数据（含座位排布和售卖状态）
     */
    @GetMapping("/internal/sessions/{id}/seats")
    Result<Object> getSeatMap(@PathVariable("id") Long sessionId);

    // ========== 订单 ==========

    /**
     * 查询用户订单列表（支持按状态筛选和分页）。
     *
     * @param userId 用户 ID
     * @param status 订单状态（可选，如"unpaid"、"paid"）
     * @param page   页码，默认 1
     * @param size   每页条数，默认 20
     * @return 订单列表分页结果
     */
    @GetMapping("/internal/orders")
    Result<Object> queryUserOrders(
            @RequestParam Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size
    );

    /**
     * 查询订单详情。
     *
     * @param orderId 订单 ID
     * @param userId  用户 ID（用于权限校验）
     * @return 订单详情数据
     */
    @GetMapping("/internal/orders/{id}")
    Result<Object> queryOrderDetail(
            @PathVariable("id") Long orderId,
            @RequestParam Long userId
    );

    /**
     * 锁定座位并创建订单。
     *
     * @param body 锁座请求体（含场次 ID、座位 ID 列表等）
     * @return 锁座结果（含订单 ID 和支付信息）
     */
    @PostMapping("/internal/orders/lock-seat")
    Result<Object> lockSeat(@RequestBody Map<String, Object> body);

    /**
     * 支付订单。
     *
     * @param orderId 订单 ID
     * @param body    支付请求体（含支付方式等）
     * @return 支付结果
     */
    @PostMapping("/internal/orders/{id}/pay")
    Result<Object> payOrder(
            @PathVariable("id") Long orderId,
            @RequestBody Map<String, Object> body
    );

    /**
     * 退款。
     *
     * @param orderId 订单 ID
     * @param body    退款请求体（含退款原因等）
     * @return 退款结果
     */
    @PostMapping("/internal/orders/{id}/refund")
    Result<Object> refundOrder(
            @PathVariable("id") Long orderId,
            @RequestBody Map<String, Object> body
    );
}
