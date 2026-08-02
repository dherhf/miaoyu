package org.dherhf.common.util;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CryptoUtil 密码学工具类测试")
class CryptoUtilTest {

    private static String aesKey;

    @BeforeAll
    static void setUp() {
        aesKey = CryptoUtil.generateAes256Key();
        new CryptoUtil().setDefaultAesBase64Key(aesKey);
    }

    @Nested
    @DisplayName("generateAes256Key")
    class GenerateAes256KeyTest {

        @Test
        @DisplayName("生成有效的 32 字节 Base64 密钥")
        void shouldGenerateValid32ByteKey() {
            String key = CryptoUtil.generateAes256Key();
            byte[] keyBytes = Base64.getDecoder().decode(key);
            assertThat(keyBytes).hasSize(32);
        }

        @Test
        @DisplayName("每次生成不同的密钥")
        void shouldGenerateDifferentKeys() {
            String key1 = CryptoUtil.generateAes256Key();
            String key2 = CryptoUtil.generateAes256Key();
            assertThat(key1).isNotEqualTo(key2);
        }
    }

    @Nested
    @DisplayName("sha256")
    class Sha256Test {

        @Test
        @DisplayName("计算正确的 SHA-256 哈希值")
        void shouldComputeCorrectHash() {
            String hash = CryptoUtil.sha256("13800138000");
            assertThat(hash).hasSize(64);
            assertThat(hash).matches("^[0-9a-f]{64}$");
        }

        @Test
        @DisplayName("相同输入产生相同哈希")
        void shouldProduceSameHashForSameInput() {
            assertThat(CryptoUtil.sha256("hello")).isEqualTo(CryptoUtil.sha256("hello"));
        }

        @Test
        @DisplayName("不同输入产生不同哈希")
        void shouldProduceDifferentHashForDifferentInput() {
            assertThat(CryptoUtil.sha256("hello")).isNotEqualTo(CryptoUtil.sha256("world"));
        }
    }

    @Nested
    @DisplayName("aes256Encrypt / aes256Decrypt")
    class Aes256Test {

        @Test
        @DisplayName("加密后解密能还原原文")
        void shouldRoundTripEncryptDecrypt() {
            String plainText = "13800138000";
            String encrypted = CryptoUtil.aes256Encrypt(plainText, aesKey);
            String decrypted = CryptoUtil.aes256Decrypt(encrypted, aesKey);
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("每次加密产生不同密文（随机 IV）")
        void shouldProduceDifferentCiphertextEachTime() {
            String plainText = "13800138000";
            String encrypted1 = CryptoUtil.aes256Encrypt(plainText, aesKey);
            String encrypted2 = CryptoUtil.aes256Encrypt(plainText, aesKey);
            assertThat(encrypted1).isNotEqualTo(encrypted2);
        }

        @Test
        @DisplayName("密文格式为 ivBase64|cipherTextBase64")
        void shouldHaveCorrectFormat() {
            String encrypted = CryptoUtil.aes256Encrypt("test", aesKey);
            String[] parts = encrypted.split("\\|", 2);
            assertThat(parts).hasSize(2);
            assertThat(Base64.getDecoder().decode(parts[0])).hasSize(12);
        }

        @Test
        @DisplayName("使用错误密钥解密抛出异常")
        void shouldThrowOnWrongKey() {
            String encrypted = CryptoUtil.aes256Encrypt("secret", aesKey);
            String wrongKey = CryptoUtil.generateAes256Key();
            assertThatThrownBy(() -> CryptoUtil.aes256Decrypt(encrypted, wrongKey))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test
        @DisplayName("使用无效密钥长度抛出异常")
        void shouldThrowOnInvalidKeyLength() {
            String shortKey = Base64.getEncoder().encodeToString(new byte[16]);
            assertThatThrownBy(() -> CryptoUtil.aes256Encrypt("test", shortKey))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test
        @DisplayName("格式错误的密文抛出异常")
        void shouldThrowOnMalformedCiphertext() {
            assertThatThrownBy(() -> CryptoUtil.aes256Decrypt("invalid", aesKey))
                    .isInstanceOf(RuntimeException.class);
        }

        @Test
        @DisplayName("支持中文加解密")
        void shouldSupportChineseText() {
            String plainText = "你好世界";
            String encrypted = CryptoUtil.aes256Encrypt(plainText, aesKey);
            String decrypted = CryptoUtil.aes256Decrypt(encrypted, aesKey);
            assertThat(decrypted).isEqualTo(plainText);
        }
    }

    @Nested
    @DisplayName("encrypt / decrypt（默认密钥）")
    class DefaultKeyTest {

        @Test
        @DisplayName("使用默认密钥加密解密能还原原文")
        void shouldRoundTripWithDefaultKey() {
            String plainText = "13900139000";
            String encrypted = CryptoUtil.encrypt(plainText);
            String decrypted = CryptoUtil.decrypt(encrypted);
            assertThat(decrypted).isEqualTo(plainText);
        }

        @Test
        @DisplayName("默认密钥加密与自定义密钥加密结果不同")
        void shouldDifferFromCustomKeyEncryption() {
            String plainText = "13800138000";
            String encryptedDefault = CryptoUtil.encrypt(plainText);
            String encryptedCustom = CryptoUtil.aes256Encrypt(plainText, aesKey);
            assertThat(encryptedDefault).isNotEqualTo(encryptedCustom);
        }
    }
}
