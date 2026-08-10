package org.dherhf.schedule.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.enums.ScheduleSeatStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Redis Bitmap 座位状态缓存。
 * <p>
 * 两个 Bitmap Key：
 * schedule:seat:locked:{scheduleId} — 1=锁定，0=未锁定/已售/可选
 * schedule:seat:sold:{scheduleId} — 1=已售，0=未售/锁定/可选
 * <p>
 * 状态判定真值表（优先级：已售 > 锁定 > 可售）：
 * sold=1 → SOLD（无论 locked 位）
 * sold=0, locked=1 → LOCKED
 * sold=0, locked=0 → AVAILABLE
 * <p>
 * MySQL 为权威数据源，Redis 作为读加速缓存，容忍短暂不一致（最终一致）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBitmapService {

    private static final String LOCKED_PREFIX = "schedule:seat:locked:";
    private static final String SOLD_PREFIX = "schedule:seat:sold:";

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<Long, Object> rebuildLocks = new ConcurrentHashMap<>();

    private String lockedKey(Long scheduleId) {
        return LOCKED_PREFIX + scheduleId;
    }

    private String soldKey(Long scheduleId) {
        return SOLD_PREFIX + scheduleId;
    }

    /**
     * 初始化空 Bitmap（全 0），仅在 Key 不存在时创建。
     */
    public void initBitmap(Long scheduleId, int totalSeats) {
        try {
            String lockKey = lockedKey(scheduleId);
            String soldKey = soldKey(scheduleId);
            if (!redisTemplate.hasKey(lockKey)) {
                redisTemplate.opsForValue().setBit(lockKey, totalSeats - 1, false);
            }
            if (!redisTemplate.hasKey(soldKey)) {
                redisTemplate.opsForValue().setBit(soldKey, totalSeats - 1, false);
            }
            log.debug("场次 {} 位图初始化完成", scheduleId);
        } catch (Exception e) {
            log.warn("场次 {} 位图初始化失败：{}", scheduleId, e.getMessage());
        }
    }

    /**
     * 从 MySQL 重建 Bitmap（全量覆盖）。
     * <p>
     * 单飞模式：同一 scheduleId 的并发重建请求只执行一次，其余线程双重检查后直接返回。
     * 原子写入：内存构建 byte[]，单次 SET 替换，无 Key 缺失窗口。
     */
    public void rebuildBitmap(Long scheduleId, List<ScheduleSeat> seats) {
        Object lock = rebuildLocks.computeIfAbsent(scheduleId, k -> new Object());
        synchronized (lock) {
            try {
                // 双重检查：等待期间其他线程可能已完成重建
                if (!bitmapMissing(scheduleId)) {
                    return;
                }

                int totalSeats = seats.size();
                int byteLen = (totalSeats + 7) / 8;
                byte[] lockedBitmap = new byte[byteLen];
                byte[] soldBitmap = new byte[byteLen];

                for (ScheduleSeat seat : seats) {
                    int idx = seat.getSeatIndex();
                    if (idx < 0 || idx >= totalSeats) {
                        continue;
                    }
                    int byteIndex = idx / 8;
                    int bitInByte = 7 - (idx % 8);
                    String status = seat.getStatus();

                    if (ScheduleSeatStatus.LOCKED.getCode().equals(status)) {
                        lockedBitmap[byteIndex] |= (byte) (1 << bitInByte);
                    }
                    if (ScheduleSeatStatus.SOLD.getCode().equals(status)) {
                        soldBitmap[byteIndex] |= (byte) (1 << bitInByte);
                    }
                }

                // 单次原子 SET：一次连接写两个 Key，无 Key 缺失窗口
                byte[] lockedKeyBytes = lockedKey(scheduleId).getBytes();
                byte[] soldKeyBytes = soldKey(scheduleId).getBytes();
                redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Object>) connection -> {
                    connection.stringCommands().set(lockedKeyBytes, lockedBitmap);
                    connection.stringCommands().set(soldKeyBytes, soldBitmap);
                    return null;
                });

                log.debug("场次 {} 位图重建完成，共 {} 个座位", scheduleId, totalSeats);
            } catch (Exception e) {
                log.warn("场次 {} 位图重建失败：{}", scheduleId, e.getMessage());
            }
        }
    }

    /**
     * 删除 Bitmap 缓存。
     */
    public void deleteBitmap(Long scheduleId) {
        try {
            redisTemplate.delete(lockedKey(scheduleId));
            redisTemplate.delete(soldKey(scheduleId));
            log.debug("场次 {} 位图已删除", scheduleId);
        } catch (Exception e) {
            log.warn("场次 {} 位图删除失败：{}", scheduleId, e.getMessage());
        }
    }

    /**
     * 锁座：SetBit locked=1
     */
    public void setLocked(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(lockedKey(scheduleId), seatIndex, true);
        } catch (Exception e) {
            log.warn("场次 {} 座位 {} 设置锁定位失败：{}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 支付：SetBit sold=1 + SetBit locked=0
     */
    public void setSold(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(soldKey(scheduleId), seatIndex, true);
            redisTemplate.opsForValue().setBit(lockedKey(scheduleId), seatIndex, false);
        } catch (Exception e) {
            log.warn("场次 {} 座位 {} 设置已售位失败：{}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 取消/超时释放：SetBit locked=0
     */
    public void clearLocked(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(lockedKey(scheduleId), seatIndex, false);
        } catch (Exception e) {
            log.warn("场次 {} 座位 {} 清除锁定位失败：{}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 退票释放：SetBit sold=0 + SetBit locked=0
     */
    public void clearSoldAndLocked(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(soldKey(scheduleId), seatIndex, false);
            redisTemplate.opsForValue().setBit(lockedKey(scheduleId), seatIndex, false);
        } catch (Exception e) {
            log.warn("场次 {} 座位 {} 清除已售+锁定位失败：{}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 检查 Bitmap 是否不存在（缓存是否未命中）。
     */
    public boolean bitmapMissing(Long scheduleId) {
        try {
            return !Boolean.TRUE.equals(redisTemplate.hasKey(lockedKey(scheduleId)));
        } catch (Exception e) {
            log.warn("场次 {} 位图存在性检查失败：{}", scheduleId, e.getMessage());
            return true;
        }
    }

    /**
     * 批量获取所有座位状态。返回数组下标 = seatIndex，值为状态码。
     * 缓存未命中返回 null。
     */
    public String[] getSeatStatuses(Long scheduleId, int totalSeats) {
        try {
            if (bitmapMissing(scheduleId)) {
                return null;
            }
            String lockKey = lockedKey(scheduleId);
            String soldKey = soldKey(scheduleId);
            String[] statuses = new String[totalSeats];
            Arrays.fill(statuses, ScheduleSeatStatus.AVAILABLE.getCode());
            // 直接读取原始字节，避免 StringRedisTemplate 的 UTF-8 解码损坏 Bitmap 数据
            byte[] lockedBits = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<byte[]>)
                    connection -> connection.stringCommands().get(lockKey.getBytes()));
            byte[] soldBits = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<byte[]>)
                    connection -> connection.stringCommands().get(soldKey.getBytes()));
            for (int i = 0; i < totalSeats; i++) {
                boolean locked = getBit(lockedBits, i);
                boolean sold = getBit(soldBits, i);
                if (sold) {
                    statuses[i] = ScheduleSeatStatus.SOLD.getCode();
                } else if (locked) {
                    statuses[i] = ScheduleSeatStatus.LOCKED.getCode();
                }
            }
            return statuses;
        } catch (Exception e) {
            log.warn("场次 {} 从位图获取座位状态失败：{}", scheduleId, e.getMessage());
            return null;
        }
    }

    private boolean getBit(byte[] bytes, long bitIndex) {
        if (bytes == null) return false;
        long byteIndex = bitIndex / 8;
        if (byteIndex >= bytes.length) return false;
        int bitInByte = 7 - (int)(bitIndex % 8);
        return (bytes[(int) byteIndex] & (1 << bitInByte)) != 0;
    }

    /**
     * 从 Bitmap BitCOUNT 获取锁定座位数。
     */
    public long getLockedCount(Long scheduleId) {
        try {
            if (bitmapMissing(scheduleId)) {
                return -1;
            }
            Long count = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Long>)
                    connection -> connection.stringCommands().bitCount(lockedKey(scheduleId).getBytes()));
            return count != null ? count : -1;
        } catch (Exception e) {
            log.warn("场次 {} 获取锁定座位数失败：{}", scheduleId, e.getMessage());
            return -1;
        }
    }

    /**
     * 从 Bitmap BitCOUNT 获取已售座位数。
     */
    public long getSoldCount(Long scheduleId) {
        try {
            if (!redisTemplate.hasKey(soldKey(scheduleId))) {
                return -1;
            }
            Long count = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Long>)
                    connection -> connection.stringCommands().bitCount(soldKey(scheduleId).getBytes()));
            return count != null ? count : -1;
        } catch (Exception e) {
            log.warn("场次 {} 获取已售座位数失败：{}", scheduleId, e.getMessage());
            return -1;
        }
    }
}
