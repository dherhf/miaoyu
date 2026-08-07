package org.dherhf.agent.tool;

import org.dherhf.agent.feign.TicketFeignClient;
import org.dherhf.common.result.ErrorCodeEnum;
import org.dherhf.common.result.Result;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * TicketServiceClient 测试。
 * <p>
 * 使用 Mockito mock {@link TicketFeignClient}，验证每个方法的成功路径和异常路径。
 * 异常路径验证错误码和错误消息前缀。
 * </p>
 */
@DisplayName("TicketServiceClient 内部接口调用测试")
class TicketServiceClientTest {

    private TicketServiceClient client;
    private TicketFeignClient feignClient;

    @BeforeEach
    void setUp() {
        feignClient = mock(TicketFeignClient.class);
        client = new TicketServiceClient(feignClient);
    }

    // ========== searchMovies ==========

    @Test
    @DisplayName("searchMovies - 成功返回影片列表")
    void searchMovies_success() {
        System.out.println("[TicketServiceClientTest] ▶ searchMovies_success");
        when(feignClient.searchMovies(any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 1, "records", List.of())));

        Result<Object> result = client.searchMovies("流浪", "", null);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ searchMovies_success PASSED");
    }

    @Test
    @DisplayName("searchMovies - 空关键词空类型")
    void searchMovies_emptyParams() {
        System.out.println("[TicketServiceClientTest] ▶ searchMovies_emptyParams");
        when(feignClient.searchMovies(any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 0, "records", List.of())));

        Result<Object> result = client.searchMovies("", "", null);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ searchMovies_emptyParams PASSED");
    }

    @Test
    @DisplayName("searchMovies - HTTP异常返回错误")
    void searchMovies_httpError() {
        System.out.println("[TicketServiceClientTest] ▶ searchMovies_httpError");
        when(feignClient.searchMovies(any(), any(), any()))
                .thenThrow(new RuntimeException("Connection refused"));

        Result<Object> result = client.searchMovies("test", "", null);

        assertEquals(ErrorCodeEnum.TOOL_ERROR.getCode(), result.getCode());
        assertTrue(result.getMessage().contains("影片查询失败"));
        System.out.println("[TicketServiceClientTest] ✓ searchMovies_httpError PASSED");
    }

    // ========== searchCinemas ==========

    @Test
    @DisplayName("searchCinemas - 成功返回影院列表")
    void searchCinemas_success() {
        System.out.println("[TicketServiceClientTest] ▶ searchCinemas_success");
        when(feignClient.searchCinemas(any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 1, "records", List.of())));

        Result<Object> result = client.searchCinemas(null, "万达", "");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ searchCinemas_success PASSED");
    }

    // ========== searchSessions ==========

    @Test
    @DisplayName("searchSessions - 成功返回场次列表")
    void searchSessions_success() {
        System.out.println("[TicketServiceClientTest] ▶ searchSessions_success");
        when(feignClient.searchSessions(any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 1, "records", List.of())));

        Result<Object> result = client.searchSessions(1L, 1L, "2026-08-05");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ searchSessions_success PASSED");
    }

    @Test
    @DisplayName("searchSessions - movieId为null")
    void searchSessions_nullMovieId() {
        System.out.println("[TicketServiceClientTest] ▶ searchSessions_nullMovieId");
        when(feignClient.searchSessions(any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 0, "records", List.of())));

        Result<Object> result = client.searchSessions(null, null, "");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ searchSessions_nullMovieId PASSED");
    }

    // ========== getSeatMap ==========

    @Test
    @DisplayName("getSeatMap - 成功返回座位图")
    void getSeatMap_success() {
        System.out.println("[TicketServiceClientTest] ▶ getSeatMap_success");
        when(feignClient.getSeatMap(any()))
                .thenReturn(Result.success(Map.of("scheduleId", 1, "seats", List.of())));

        Result<Object> result = client.getSeatMap(1L);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ getSeatMap_success PASSED");
    }

    // ========== queryUserOrders ==========

    @Test
    @DisplayName("queryUserOrders - 成功返回订单列表")
    void queryUserOrders_success() {
        System.out.println("[TicketServiceClientTest] ▶ queryUserOrders_success");
        when(feignClient.queryUserOrders(any(), any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 1, "records", List.of())));

        Result<Object> result = client.queryUserOrders(1L, "paid", 1, 20);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ queryUserOrders_success PASSED");
    }

    @Test
    @DisplayName("queryUserOrders - status为null查全部")
    void queryUserOrders_nullStatus() {
        System.out.println("[TicketServiceClientTest] ▶ queryUserOrders_nullStatus");
        when(feignClient.queryUserOrders(any(), any(), any(), any()))
                .thenReturn(Result.success(Map.of("total", 0, "records", List.of())));

        Result<Object> result = client.queryUserOrders(1L, null, 1, 20);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ queryUserOrders_nullStatus PASSED");
    }

    // ========== queryOrderDetail ==========

    @Test
    @DisplayName("queryOrderDetail - 成功返回订单详情")
    void queryOrderDetail_success() {
        System.out.println("[TicketServiceClientTest] ▶ queryOrderDetail_success");
        when(feignClient.queryOrderDetail(any(), any()))
                .thenReturn(Result.success(Map.of("id", 1, "status", "paid")));

        Result<Object> result = client.queryOrderDetail(1L, 1L);

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ queryOrderDetail_success PASSED");
    }

    // ========== lockSeat ==========

    @Test
    @DisplayName("lockSeat - 成功锁座下单")
    void lockSeat_success() {
        System.out.println("[TicketServiceClientTest] ▶ lockSeat_success");
        when(feignClient.lockSeat(any()))
                .thenReturn(Result.success(Map.of("id", 1, "status", "pending")));

        Result<Object> result = client.lockSeat(1L, 1L, List.of(10L, 11L), 2, "req-001");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ lockSeat_success PASSED");
    }

    @Test
    @DisplayName("lockSeat - HTTP异常返回错误")
    void lockSeat_httpError() {
        System.out.println("[TicketServiceClientTest] ▶ lockSeat_httpError");
        when(feignClient.lockSeat(any()))
                .thenThrow(new RuntimeException("Timeout"));

        Result<Object> result = client.lockSeat(1L, 1L, List.of(10L), 1, "req-002");

        assertEquals(ErrorCodeEnum.TOOL_ERROR.getCode(), result.getCode());
        assertTrue(result.getMessage().contains("锁座下单失败"));
        System.out.println("[TicketServiceClientTest] ✓ lockSeat_httpError PASSED");
    }

    // ========== payOrder ==========

    @Test
    @DisplayName("payOrder - 成功支付")
    void payOrder_success() {
        System.out.println("[TicketServiceClientTest] ▶ payOrder_success");
        when(feignClient.payOrder(any(), any()))
                .thenReturn(Result.success(Map.of("id", 1, "status", "paid", "pickupCode", "ABC123")));

        Result<Object> result = client.payOrder(1L, 1L, "req-pay-001");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ payOrder_success PASSED");
    }

    // ========== cancelOrder ==========

    @Test
    @DisplayName("cancelOrder - 成功取消")
    void cancelOrder_success() {
        System.out.println("[TicketServiceClientTest] ▶ cancelOrder_success");
        when(feignClient.cancelOrder(any(), any()))
                .thenReturn(Result.success(null));

        Result<Object> result = client.cancelOrder(1L, 1L, "req-cancel-001");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ cancelOrder_success PASSED");
    }

    @Test
    @DisplayName("cancelOrder - HTTP异常返回错误")
    void cancelOrder_httpError() {
        System.out.println("[TicketServiceClientTest] ▶ cancelOrder_httpError");
        when(feignClient.cancelOrder(any(), any()))
                .thenThrow(new RuntimeException("Connection refused"));

        Result<Object> result = client.cancelOrder(1L, 1L, "req-cancel-002");

        assertEquals(ErrorCodeEnum.TOOL_ERROR.getCode(), result.getCode());
        assertTrue(result.getMessage().contains("取消订单失败"));
        System.out.println("[TicketServiceClientTest] ✓ cancelOrder_httpError PASSED");
    }

    // ========== refundOrder ==========

    @Test
    @DisplayName("refundOrder - 成功退票")
    void refundOrder_success() {
        System.out.println("[TicketServiceClientTest] ▶ refundOrder_success");
        when(feignClient.refundOrder(any(), any()))
                .thenReturn(Result.success(null));

        Result<Object> result = client.refundOrder(1L, 1L, "req-refund-001");

        assertEquals(0, result.getCode());
        System.out.println("[TicketServiceClientTest] ✓ refundOrder_success PASSED");
    }

    @Test
    @DisplayName("refundOrder - HTTP异常返回错误")
    void refundOrder_httpError() {
        System.out.println("[TicketServiceClientTest] ▶ refundOrder_httpError");
        when(feignClient.refundOrder(any(), any()))
                .thenThrow(new RuntimeException("Timeout"));

        Result<Object> result = client.refundOrder(1L, 1L, "req-refund-002");

        assertEquals(ErrorCodeEnum.TOOL_ERROR.getCode(), result.getCode());
        assertTrue(result.getMessage().contains("退票失败"));
        System.out.println("[TicketServiceClientTest] ✓ refundOrder_httpError PASSED");
    }
}
