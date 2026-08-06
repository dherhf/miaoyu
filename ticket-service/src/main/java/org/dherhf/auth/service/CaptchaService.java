package org.dherhf.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.auth.vo.CaptchaVO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.util.Base64;
import java.util.Random;
import java.util.UUID;

/**
 * 图形验证码服务,负责生成验证码图片并管理 Redis 中的验证码生命周期。
 * <p>
 * 验证码为 4 位字符（排除易混淆字符）,存入 Redis {@code captcha:{captchaId}} 键,
 * TTL 默认 60 秒,验证时一次性删除（无论对错）以防止暴力枚举。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private static final String CAPTCHA_KEY_PREFIX = "captcha:";
    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    private final StringRedisTemplate redisTemplate;

    @Value("${captcha.expire-seconds:60}")
    private int expireSeconds;

    @Value("${captcha.length:4}")
    private int length;

    /**
     * 生成图形验证码,存入 Redis 并返回 Base64 图片。
     *
     * @return 验证码视图对象,包含 captchaId 和 Base64 图片
     */
    public CaptchaVO generate() {
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        String code = generateCode();

        BufferedImage image = drawImage(code);
        String base64Image = toBase64(image);

        redisTemplate.opsForValue().set(
                CAPTCHA_KEY_PREFIX + captchaId, code.toLowerCase(),
                Duration.ofSeconds(expireSeconds));

        return CaptchaVO.builder()
                .captchaId(captchaId)
                .image("data:image/png;base64," + base64Image)
                .build();
    }

    /**
     * 校验验证码,无论校验结果如何都会删除 Redis 中的验证码（一次性使用）。
     *
     * @param captchaId   验证码唯一标识
     * @param captchaCode 用户输入的验证码
     * @return {@code true} 校验通过,{@code false} 验证码已过期或不匹配
     */
    public boolean validate(String captchaId, String captchaCode) {
        String key = CAPTCHA_KEY_PREFIX + captchaId;
        String stored = redisTemplate.opsForValue().get(key);
        redisTemplate.delete(key);
        return stored != null && stored.equalsIgnoreCase(captchaCode);
    }

    /**
     * 生成指定长度的随机验证码,排除易混淆字符（0/O/1/I/l）。
     */
    private String generateCode() {
        Random random = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    /**
     * 使用 AWT 绘制验证码图片（160×50 px）,包含随机颜色字符、干扰线和噪点。
     */
    private BufferedImage drawImage(String code) {
        int width = 160;
        int height = 50;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        Random random = new Random();

        // 背景
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);

        // 干扰线
        for (int i = 0; i < 30; i++) {
            g.setColor(new Color(random.nextInt(200), random.nextInt(200), random.nextInt(200)));
            int x1 = random.nextInt(width);
            int y1 = random.nextInt(height);
            int x2 = random.nextInt(width);
            int y2 = random.nextInt(height);
            g.drawLine(x1, y1, x2, y2);
        }

        // 噪点
        for (int i = 0; i < 20; i++) {
            int x = random.nextInt(width);
            int y = random.nextInt(height);
            image.setRGB(x, y, new Color(random.nextInt(255), random.nextInt(255), random.nextInt(255)).getRGB());
        }

        // 字符
        g.setFont(new Font("Arial", Font.BOLD | Font.ITALIC, 28));
        for (int i = 0; i < code.length(); i++) {
            g.setColor(new Color(20 + random.nextInt(110), 20 + random.nextInt(110), 20 + random.nextInt(110)));
            g.drawString(String.valueOf(code.charAt(i)), 10 + i * 35, 35 + random.nextInt(8) - 4);
        }

        g.dispose();
        return image;
    }

    /**
     * 将 BufferedImage 转为 Base64 字符串。
     */
    private String toBase64(BufferedImage image) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.error("验证码图片转换失败", e);
            throw new RuntimeException("验证码生成失败", e);
        }
    }
}
