package org.dherhf.common.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * 密码学工具类,提供 SHA-256 哈希和 AES-256-GCM 加密/解密。
 * <p>
 * 基于 JDK 原生 JCA 实现,采用 Spring {@code @Component} 模式管理,
 * 支持从配置文件自动读取默认 AES 密钥。
 */
@Component
@ConditionalOnProperty(name = "crypto.aes-base64-key")
public class CryptoUtil {

    private static String defaultAesBase64Key;

    /**
     * 由 Spring 注入配置文件中的默认 AES 密钥，存入静态字段供全局使用。
     *
     * @param key Base64 编码的 32 字节 AES 密钥，来源于配置项 {@code crypto.aes-base64-key}
     */
    @Value("${crypto.aes-base64-key}")
    public void setDefaultAesBase64Key(String key) {
        CryptoUtil.defaultAesBase64Key = key;
    }

    private static final String AES_ALG = "AES";
    private static final String AES_TRANS = "AES/GCM/NoPadding";
    private static final int AES_256_KEY_LEN = 32;
    private static final int GCM_IV_LEN = 12;
    private static final int GCM_TAG_LEN = 128;

    /**
     * 生成 32 字节 AES-256 密钥,返回 Base64 字符串。
     *
     * @return Base64 编码的密钥字符串
     */
    public static String generateAes256Key() {
        SecureRandom random = new SecureRandom();
        byte[] key = new byte[AES_256_KEY_LEN];
        random.nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }

    /**
     * 计算字符串的 SHA-256 哈希值。
     *
     * @param plainText 原文字符串
     * @return 64 位十六进制哈希字符串
     */
    public static String sha256(String plainText) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] raw = plainText.getBytes(StandardCharsets.UTF_8);
            byte[] hashBytes = md.digest(raw);
            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("SHA256 哈希计算失败", e);
        }
    }

    /**
     * 使用配置文件中的默认密钥进行 AES-256-GCM 加密。
     *
     * @param plainText 原文字符串
     * @return {@code ivBase64|cipherTextAndTagBase64} 格式的密文字符串
     */
    public static String encrypt(String plainText) {
        return aes256Encrypt(plainText, defaultAesBase64Key);
    }

    /**
     * 使用配置文件中的默认密钥进行 AES-256-GCM 解密。
     *
     * @param encryptStr {@code ivBase64|cipherTextAndTagBase64} 格式的密文字符串
     * @return 解密后的原文字符串
     */
    public static String decrypt(String encryptStr) {
        return aes256Decrypt(encryptStr, defaultAesBase64Key);
    }

    /**
     * 使用自定义密钥进行 AES-256-GCM 加密。
     *
     * @param plainText 原文字符串
     * @param base64Key Base64 编码的 32 字节密钥
     * @return {@code ivBase64|cipherTextAndTagBase64} 格式的密文字符串
     */
    public static String aes256Encrypt(String plainText, String base64Key) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            if (keyBytes.length != AES_256_KEY_LEN) {
                throw new IllegalArgumentException("AES256密钥必须为32字节");
            }
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, AES_ALG);

            SecureRandom random = new SecureRandom();
            byte[] iv = new byte[GCM_IV_LEN];
            random.nextBytes(iv);

            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LEN, iv);

            Cipher cipher = Cipher.getInstance(AES_TRANS);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            byte[] cipherData = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            String ivB64 = Base64.getEncoder().encodeToString(iv);
            String dataB64 = Base64.getEncoder().encodeToString(cipherData);
            return ivB64 + "|" + dataB64;
        } catch (Exception e) {
            throw new RuntimeException("AES256 加密失败", e);
        }
    }

    /**
     * 使用自定义密钥进行 AES-256-GCM 解密。
     *
     * @param encryptStr {@code ivBase64|cipherTextAndTagBase64} 格式的密文字符串
     * @param base64Key  Base64 编码的 32 字节密钥
     * @return 解密后的原文字符串
     */
    public static String aes256Decrypt(String encryptStr, String base64Key) {
        try {
            String[] parts = encryptStr.split("\\|", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("加密字符串格式错误");
            }
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] cipherBytes = Base64.getDecoder().decode(parts[1]);

            if (iv.length != GCM_IV_LEN) {
                throw new IllegalArgumentException("GCM IV 长度必须为 " + GCM_IV_LEN + " 字节");
            }

            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, AES_ALG);

            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LEN, iv);

            Cipher cipher = Cipher.getInstance(AES_TRANS);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

            byte[] plainBytes = cipher.doFinal(cipherBytes);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (javax.crypto.AEADBadTagException e) {
            throw new RuntimeException("AES256 解密失败：数据完整性校验未通过", e);
        } catch (Exception e) {
            throw new RuntimeException("AES256 解密失败", e);
        }
    }
}
