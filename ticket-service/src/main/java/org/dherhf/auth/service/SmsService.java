package org.dherhf.auth.service;

import com.aliyun.auth.credentials.Credential;
import com.aliyun.auth.credentials.provider.StaticCredentialProvider;
import com.aliyun.sdk.service.dypnsapi20170525.AsyncClient;
import com.aliyun.sdk.service.dypnsapi20170525.models.SendSmsVerifyCodeRequest;
import com.aliyun.sdk.service.dypnsapi20170525.models.SendSmsVerifyCodeResponse;
import com.aliyun.sdk.service.dypnsapi20170525.models.SendSmsVerifyCodeResponseBody;
import darabonba.core.client.ClientOverrideConfiguration;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.util.CryptoUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 短信验证码服务,封装阿里云号码认证服务（dypnsapi）的验证码发送与核验。
 * <p>
 * 使用 V2 异步 SDK（{@link AsyncClient}）,在 {@code @PostConstruct} 中创建客户端、
 * {@code @PreDestroy} 中关闭。发送频率通过 Redis 限频控制（默认 60 秒/次）。
 * 验证码由阿里云生成,通过 {@code returnVerifyCode=true} 返回后存入 Redis,
 * 核验时本地比对 Redis（一次性消费）,不调用 {@code CheckSmsVerifyCode} API。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private static final String RATE_LIMIT_KEY_PREFIX = "sms:limit:";
    private static final String CODE_KEY_PREFIX = "sms:code:";
    private static final String COUNTRY_CODE = "86";

    private final StringRedisTemplate redisTemplate;

    @Value("${sms.access-key-id}")
    private String accessKeyId;

    @Value("${sms.access-key-secret}")
    private String accessKeySecret;

    @Value("${sms.sign-name}")
    private String signName;

    @Value("${sms.template-code-register}")
    private String templateCodeRegister;

    @Value("${sms.template-code-reset-password}")
    private String templateCodeResetPassword;

    @Value("${sms.endpoint}")
    private String endpoint;

    @Value("${sms.region}")
    private String region;

    @Value("${sms.send-interval:60}")
    private int sendInterval;

    @Value("${sms.code-length:4}")
    private int codeLength;

    @Value("${sms.valid-time:300}")
    private int validTime;

    private AsyncClient client;

    /**
     * 初始化阿里云 dypnsapi 异步客户端。
     */
    @PostConstruct
    public void init() {
        if (accessKeyId == null || accessKeyId.isBlank()) {
            log.warn("短信服务 AccessKey 未配置,短信验证码功能不可用");
            return;
        }

        StaticCredentialProvider provider = StaticCredentialProvider.create(
                Credential.builder()
                        .accessKeyId(accessKeyId)
                        .accessKeySecret(accessKeySecret)
                        .build());

        this.client = AsyncClient.builder()
                .region(region)
                .credentialsProvider(provider)
                .overrideConfiguration(ClientOverrideConfiguration.create()
                        .setEndpointOverride(endpoint))
                .build();

        log.info("短信服务客户端初始化完成,region={}, endpoint={}", region, endpoint);
    }

    /**
     * 关闭阿里云 dypnsapi 异步客户端。
     */
    @PreDestroy
    public void shutdown() {
        if (client != null) {
            try {
                client.close();
            } catch (Exception e) {
                log.warn("关闭短信服务客户端异常", e);
            }
        }
    }

    /**
     * 发送短信验证码。
     * <p>
     * 先检查 Redis 限频,再调用阿里云 {@code SendSmsVerifyCode} API 发送验证码。
     * 通过 {@code returnVerifyCode=true} 获取阿里云生成的验证码,存入 Redis 供本地核验。
     * 根据场景选择对应的短信模板（注册:templateCodeRegister,重置密码:templateCodeResetPassword）。
     *
     * @param phone 手机号
     * @param scene 场景类型：register-注册,reset-password-重置密码
     * @throws BusinessException 发送频率过高时抛出 429,阿里云 API 调用失败时抛出 500
     */
    public void sendVerifyCode(String phone, String scene) {
        if (client == null) {
            throw new BusinessException(500, "短信服务未初始化");
        }

        String phoneHash = CryptoUtil.sha256(phone);
        String rateLimitKey = RATE_LIMIT_KEY_PREFIX + phoneHash;

        if (Boolean.TRUE.equals(redisTemplate.hasKey(rateLimitKey))) {
            throw new BusinessException(429, "发送频率过高,请稍后再试");
        }

        String templateCode = "reset-password".equals(scene)
                ? templateCodeResetPassword : templateCodeRegister;

        SendSmsVerifyCodeRequest request = SendSmsVerifyCodeRequest.builder()
                .phoneNumber(phone)
                .signName(signName)
                .templateCode(templateCode)
                .templateParam("{\"code\":\"##code##\",\"min\":\"5\"}")
                .codeType(1L)
                .codeLength((long) codeLength)
                .validTime((long) validTime)
                .duplicatePolicy(1L)
                .interval((long) sendInterval)
                .countryCode(COUNTRY_CODE)
                .returnVerifyCode(true)
                .build();

        try {
            SendSmsVerifyCodeResponse response = client.sendSmsVerifyCode(request).get();
            SendSmsVerifyCodeResponseBody body = response.getBody();

            if (!"OK".equals(body.getCode())) {
                log.error("短信发送失败 phone={} code={} message={}", phone, body.getCode(), body.getMessage());
                throw new BusinessException(500, "短信发送失败：" + body.getMessage());
            }

            redisTemplate.opsForValue().set(rateLimitKey, "1", Duration.ofSeconds(sendInterval));

            String verifyCode = body.getModel() != null ? body.getModel().getVerifyCode() : null;
            if (verifyCode != null && !verifyCode.isBlank()) {
                String codeKey = CODE_KEY_PREFIX + phoneHash;
                redisTemplate.opsForValue().set(codeKey, verifyCode, Duration.ofSeconds(validTime));
            } else {
                log.warn("短信发送成功但未返回验证码 phone={}", phone);
            }

            log.info("短信验证码已发送 phone={}", phone);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("短信发送异常 phone={}", phone, e);
            throw new BusinessException(500, "短信发送异常");
        }
    }

    /**
     * 核验短信验证码（本地 Redis 比对,一次性消费）。
     * <p>
     * 从 Redis 读取验证码并与用户输入比对,无论对错都立即删除（防止暴力枚举）。
     *
     * @param phone 手机号
     * @param code  用户输入的验证码
     * @return {@code true} 核验通过,{@code false} 验证码错误或已过期
     */
    public boolean checkVerifyCode(String phone, String code) {
        String phoneHash = CryptoUtil.sha256(phone);
        String codeKey = CODE_KEY_PREFIX + phoneHash;

        String stored = redisTemplate.opsForValue().get(codeKey);
        redisTemplate.delete(codeKey);

        boolean pass = stored != null && stored.equals(code);
        log.info("短信验证码核验 phone={} result={}", phone, pass ? "PASS" : "FAIL");
        return pass;
    }
}
