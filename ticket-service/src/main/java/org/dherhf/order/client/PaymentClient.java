package org.dherhf.order.client;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.order.config.PaymentProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

/**
 * AI知托付商户API客户端。
 * <p>
 * 适配对方实际实现：
 * - 创建支付单: POST /api/open/v1/payment-intents
 * - 查询支付状态: POST /api/open/v1/transfer-verifications
 * - 签名: HMAC-SHA256(canonical + signatureKey, base64Decode(hmacKey))
 *   canonical = method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body
 *   body = 字段拼接（非 JSON），如 merchantOrderNo|amount|payeeUserId
 */
@Slf4j
@Component
public class PaymentClient {

    private final PaymentProperties props;
    private final RestClient restClient;

    public PaymentClient(PaymentProperties props) {
        this.props = props;
        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .build();
    }

    /**
     * 创建支付单。
     *
     * @param merchantOrderNo 妙语订单号
     * @param amount          金额（元，两位小数字符串）
     * @param payeeUserId     收款方用户ID
     * @return 创建支付单响应
     */
    public CreatePaymentResponse createPayment(String merchantOrderNo, String amount, String payeeUserId) {
        String path = "/api/open/v1/payment-intents";
        // 对方签名 body 是字段拼接，非 JSON
        String signBody = merchantOrderNo + "|" + amount + "|" + payeeUserId;
        // 请求 body 是 JSON
        String jsonBody = """
                {"merchantOrderNo":"%s","amount":%s,"payeeUserId":%s}
                """.formatted(merchantOrderNo, amount, payeeUserId);

        Map<String, String> headers = buildSignedHeaders("POST", path, signBody);

        var response = restClient.post()
                .uri(path)
                .header("X-Merchant-Id", headers.get("X-Merchant-Id"))
                .header("X-Key-Id", headers.get("X-Key-Id"))
                .header("X-Timestamp", headers.get("X-Timestamp"))
                .header("X-Nonce", headers.get("X-Nonce"))
                .header("X-Signature", headers.get("X-Signature"))
                .header("Content-Type", "application/json")
                .body(jsonBody)
                .retrieve()
                .body(CreatePaymentResponse.class);

        log.info("[PaymentClient] createPayment: orderNo={}, paymentIntent={}", merchantOrderNo,
                response != null && response.getData() != null ? "ok" : "null");
        return response;
    }

    /**
     * 查询支付状态。
     *
     * @param businessNo      对方转账流水号（TransferOrder.businessNo）
     * @param merchantOrderNo 妙语订单号
     * @return 查询结果
     */
    public QueryPaymentResponse queryPayment(String businessNo, String merchantOrderNo) {
        String path = "/api/open/v1/transfer-verifications";
        String signBody = businessNo + "|" + merchantOrderNo;
        String jsonBody = """
                {"businessNo":"%s","merchantOrderNo":"%s"}
                """.formatted(businessNo, merchantOrderNo);

        Map<String, String> headers = buildSignedHeaders("POST", path, signBody);

        var response = restClient.post()
                .uri(path)
                .header("X-Merchant-Id", headers.get("X-Merchant-Id"))
                .header("X-Key-Id", headers.get("X-Key-Id"))
                .header("X-Timestamp", headers.get("X-Timestamp"))
                .header("X-Nonce", headers.get("X-Nonce"))
                .header("X-Signature", headers.get("X-Signature"))
                .header("Content-Type", "application/json")
                .body(jsonBody)
                .retrieve()
                .body(QueryPaymentResponse.class);

        log.info("[PaymentClient] queryPayment: businessNo={}, status={}", businessNo,
                response != null && response.getData() != null ? response.getData().getOrderStatus() : "null");
        return response;
    }

    /**
     * 验证回调签名。
     * 回调签名用 callbackSecret（纯字符串密钥），与商户API签名不同。
     *
     * @param rawBody 原始请求体（去掉 sign 字段后的 body）
     * @param sign    回调中的签名字段
     * @return true 验签通过
     */
    public boolean verifyCallbackSign(String rawBody, String sign) {
        String expected = hmacSha256(rawBody, props.getCallbackSecret());
        return expected.equals(sign);
    }

    /**
     * 构造商户签名 Header。
     * 对方算法：HMAC-SHA256(canonical + signatureKey, base64Decode(hmacKey))
     * canonical = method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + signBody
     */
    private Map<String, String> buildSignedHeaders(String method, String path, String signBody) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString();
        String canonical = method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + signBody;
        // 对方 HmacDigestGenerator: input = canonical + searchKey
        String input = canonical + props.getSignatureKey();
        // 密钥是 base64 解码后的字节
        byte[] keyBytes = Base64.getDecoder().decode(props.getMerchantHmacKey());
        String signature = hmacSha256(input, keyBytes);

        return Map.of(
                "X-Merchant-Id", props.getMerchantId(),
                "X-Key-Id", props.getKeyId(),
                "X-Timestamp", timestamp,
                "X-Nonce", nonce,
                "X-Signature", signature
        );
    }

    private static String hmacSha256(String data, byte[] keyBytes) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 error", e);
        }
    }

    private static String hmacSha256(String data, String key) {
        return hmacSha256(data, key.getBytes(StandardCharsets.UTF_8));
    }

    // ---- Response DTOs ----

    @lombok.Data
    public static class CreatePaymentResponse {
        private boolean success;
        private String code;
        private String message;
        private CreatePaymentData data;
        private String traceId;
        private String timestamp;
    }

    @lombok.Data
    public static class CreatePaymentData {
        /** 签名支付票据（base64url.payload + "." + HMAC） */
        private String paymentIntent;
        /** 支付页地址 */
        private String payUrl;
        /** 过期时间 */
        private String expiresAt;
    }

    @lombok.Data
    public static class QueryPaymentResponse {
        private boolean success;
        private String code;
        private String message;
        private QueryPaymentData data;
        private String traceId;
        private String timestamp;
    }

    @lombok.Data
    public static class QueryPaymentData {
        private String businessNo;
        private String orderStatus;
        private String completedAt;
    }
}
