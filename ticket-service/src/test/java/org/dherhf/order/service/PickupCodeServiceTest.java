package org.dherhf.order.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PickupCodeServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;

    @InjectMocks
    private PickupCodeService pickupCodeService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    @Test
    void getOrCreateCode_existingCode_returnsSame() {
        System.out.println("[PickupCodeServiceTest] ▶ getOrCreateCode_existingCode_returnsSame");
        when(valueOps.get("pickup:order:1")).thenReturn("AB3K9X");

        String code = pickupCodeService.getOrCreateCode(1L);

        assertEquals("AB3K9X", code);
        verify(valueOps, never()).setIfAbsent(anyString(), anyString(), any(Duration.class));
        System.out.println("[PickupCodeServiceTest] ✓ getOrCreateCode_existingCode_returnsSame PASSED");
    }

    @Test
    void getOrCreateCode_noExisting_generatesNew() {
        System.out.println("[PickupCodeServiceTest] ▶ getOrCreateCode_noExisting_generatesNew");
        when(valueOps.get("pickup:order:1")).thenReturn(null);
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        String code = pickupCodeService.getOrCreateCode(1L);

        assertNotNull(code);
        assertEquals(6, code.length());
        verify(valueOps).set(eq("pickup:order:1"), eq(code), eq(Duration.ofSeconds(60)));
        System.out.println("[PickupCodeServiceTest] ✓ getOrCreateCode_noExisting_generatesNew PASSED");
    }

    @Test
    void generateCode_sixCharacters() {
        System.out.println("[PickupCodeServiceTest] ▶ generateCode_sixCharacters");
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        String code = pickupCodeService.generateCode(1L);

        assertNotNull(code);
        assertEquals(6, code.length());
        // 验证不包含易混淆字符
        String charset = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        for (char c : code.toCharArray()) {
            assertTrue(charset.indexOf(c) >= 0, "字符 " + c + " 不在合法字符集中");
        }
        System.out.println("[PickupCodeServiceTest] ✓ generateCode_sixCharacters PASSED (code=" + code + ")");
    }

    @Test
    void generateCode_doesNotDeleteOldCode() {
        System.out.println("[PickupCodeServiceTest] ▶ generateCode_doesNotDeleteOldCode");
        when(valueOps.get("pickup:order:1")).thenReturn("OLDCODE");
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        pickupCodeService.generateCode(1L);

        // 不应删除旧码的反向映射，让它自然过期
        verify(redisTemplate, never()).delete("pickup:code:OLDCODE");
        System.out.println("[PickupCodeServiceTest] ✓ generateCode_doesNotDeleteOldCode PASSED");
    }

    @Test
    void verifyCode_valid_returnsOrderId() {
        System.out.println("[PickupCodeServiceTest] ▶ verifyCode_valid_returnsOrderId");
        when(valueOps.get("pickup:code:AB3K9X")).thenReturn("42");

        Long orderId = pickupCodeService.verifyCode("AB3K9X");

        assertEquals(42L, orderId);
        System.out.println("[PickupCodeServiceTest] ✓ verifyCode_valid_returnsOrderId PASSED");
    }

    @Test
    void verifyCode_expired_returnsNull() {
        System.out.println("[PickupCodeServiceTest] ▶ verifyCode_expired_returnsNull");
        when(valueOps.get("pickup:code:AB3K9X")).thenReturn(null);

        Long orderId = pickupCodeService.verifyCode("AB3K9X");

        assertNull(orderId);
        System.out.println("[PickupCodeServiceTest] ✓ verifyCode_expired_returnsNull PASSED");
    }

    @Test
    void verifyCode_wrongLength_returnsNull() {
        System.out.println("[PickupCodeServiceTest] ▶ verifyCode_wrongLength_returnsNull");
        Long orderId = pickupCodeService.verifyCode("ABC");
        assertNull(orderId);

        orderId = pickupCodeService.verifyCode("ABCDEFG");
        assertNull(orderId);

        orderId = pickupCodeService.verifyCode(null);
        assertNull(orderId);
        System.out.println("[PickupCodeServiceTest] ✓ verifyCode_wrongLength_returnsNull PASSED");
    }

    @Test
    void verifyCode_caseInsensitive() {
        System.out.println("[PickupCodeServiceTest] ▶ verifyCode_caseInsensitive");
        when(valueOps.get("pickup:code:AB3K9X")).thenReturn("42");

        Long orderId = pickupCodeService.verifyCode("ab3k9x");

        assertEquals(42L, orderId);
        System.out.println("[PickupCodeServiceTest] ✓ verifyCode_caseInsensitive PASSED");
    }

    @Test
    void removeCode_cleansBothKeys() {
        System.out.println("[PickupCodeServiceTest] ▶ removeCode_cleansBothKeys");
        when(valueOps.get("pickup:order:1")).thenReturn("AB3K9X");

        pickupCodeService.removeCode(1L);

        verify(redisTemplate).delete("pickup:code:AB3K9X");
        verify(redisTemplate).delete("pickup:order:1");
        System.out.println("[PickupCodeServiceTest] ✓ removeCode_cleansBothKeys PASSED");
    }

    @Test
    void removeCode_noExistingCode_doesNothing() {
        System.out.println("[PickupCodeServiceTest] ▶ removeCode_noExistingCode_doesNothing");
        when(valueOps.get("pickup:order:1")).thenReturn(null);

        pickupCodeService.removeCode(1L);

        verify(redisTemplate, never()).delete(anyString());
        System.out.println("[PickupCodeServiceTest] ✓ removeCode_noExistingCode_doesNothing PASSED");
    }

    @Test
    void getRemainingTtl_validKey_returnsTtl() {
        System.out.println("[PickupCodeServiceTest] ▶ getRemainingTtl_validKey_returnsTtl");
        when(redisTemplate.getExpire("pickup:order:1", TimeUnit.SECONDS)).thenReturn(35L);

        int ttl = pickupCodeService.getRemainingTtl(1L);

        assertEquals(35, ttl);
        System.out.println("[PickupCodeServiceTest] ✓ getRemainingTtl_validKey_returnsTtl PASSED");
    }

    @Test
    void getRemainingTtl_expiredKey_returnsDefault() {
        System.out.println("[PickupCodeServiceTest] ▶ getRemainingTtl_expiredKey_returnsDefault");
        when(redisTemplate.getExpire("pickup:order:1", TimeUnit.SECONDS)).thenReturn(-2L);

        int ttl = pickupCodeService.getRemainingTtl(1L);

        assertEquals(60, ttl);
        System.out.println("[PickupCodeServiceTest] ✓ getRemainingTtl_expiredKey_returnsDefault PASSED");
    }
}
