package org.dherhf.order.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.order.client.PaymentClient;
import org.dherhf.order.service.OrderService;
import org.springframework.web.bind.annotation.*;

/**
 * 支付回调接口（AI知托付→妙语）。
 * <p>
 * 接收 AI知托付的异步支付结果回调，验签后委托 OrderService 处理。
 */
@Slf4j
@RestController
@RequestMapping("/internal/payment")
@RequiredArgsConstructor
public class PaymentCallbackController {

    private final PaymentClient paymentClient;
    private final OrderService orderService;

    @PostMapping("/callback")
    public String onPaymentCallback(HttpServletRequest request,
                                     @RequestBody String rawBody) {
        // 提取签名（body 中的 sign 字段）
        String sign = extractSignFromJson(rawBody);

        // 去掉 sign 字段后的 body 用于验签
        String bodyForVerify = removeSignField(rawBody);

        // HMAC-SHA256 验签
        if (sign == null || !paymentClient.verifyCallbackSign(bodyForVerify, sign)) {
            log.warn("[PaymentCallback] 回调验签失败");
            return "FAIL";
        }

        // 解析回调内容
        String paymentNo = extractJsonField(rawBody, "paymentNo");
        String merchantOrderNo = extractJsonField(rawBody, "merchantOrderNo");
        String businessNo = extractJsonField(rawBody, "businessNo");
        String status = extractJsonField(rawBody, "status");
        String amount = extractJsonField(rawBody, "amount");

        log.info("[PaymentCallback] 收到回调: orderNo={}, paymentNo={}, status={}", merchantOrderNo, paymentNo, status);

        return orderService.handlePaymentCallback(paymentNo, merchantOrderNo, businessNo, status, amount);
    }

    /**
     * 从 JSON body 中提取 sign 字段值。
     */
    private String extractSignFromJson(String json) {
        return extractJsonField(json, "sign");
    }

    /**
     * 去掉 JSON body 中的 sign 字段，返回验签用 body。
     */
    private String removeSignField(String json) {
        String key = "\"sign\"";
        int idx = json.indexOf(key);
        if (idx < 0) return json;
        // 找到 sign 字段前的逗号
        int commaStart = json.lastIndexOf(",", idx);
        // 找到 sign 值结束位置
        int colonIdx = json.indexOf(":", idx + key.length());
        int start = colonIdx + 1;
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '"')) start++;
        int end = start;
        while (end < json.length() && json.charAt(end) != '"' && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
        if (end < json.length() && json.charAt(end) == '"') end++;
        // 删除 ", "sign":"value""
        if (commaStart >= 0) {
            return json.substring(0, commaStart) + json.substring(end);
        }
        // sign 是唯一字段或第一个字段
        return json.substring(0, idx) + json.substring(end);
    }

    /**
     * 简易 JSON 字段提取（避免引入额外 JSON 库）。
     */
    private String extractJsonField(String json, String field) {
        String key = "\"" + field + "\"";
        int idx = json.indexOf(key);
        if (idx < 0) return null;
        int colonIdx = json.indexOf(":", idx + key.length());
        if (colonIdx < 0) return null;
        int start = colonIdx + 1;
        // 跳过空白和引号
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '"')) start++;
        int end = start;
        while (end < json.length() && json.charAt(end) != '"' && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
        return json.substring(start, end).trim();
    }
}
