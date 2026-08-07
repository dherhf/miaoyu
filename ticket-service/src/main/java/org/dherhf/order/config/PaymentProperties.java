package org.dherhf.order.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 支付联动配置项（AI知托付商户API）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "payment")
public class PaymentProperties {

    private String baseUrl;

    private String merchantId;

    private String keyId;

    /** HMAC 密钥（base64 编码，对方 CryptoProperties.hmacKey） */
    private String merchantHmacKey;

    /** 签名检索键（对方 MerchantPaymentProperties.signatureKey） */
    private String signatureKey;

    private String callbackSecret;

    private String callbackUrl;

    private String payeeUserId;

    private int expireMinutes = 15;
}
