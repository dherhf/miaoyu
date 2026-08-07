package org.dherhf.schedule.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.schedule.enums.ScheduleSeatStatus;
import org.springframework.data.redis.connection.RedisStringCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Redis Bitmap 座位状态缓存。
 * <p>
 * 两个 Bitmap Key：
 * schedule:seat:occupied:{scheduleId} — 1=已占用(locked+sold)，0=可选
 * schedule:seat:sold:{scheduleId} — 1=已售，0=未售/锁定
 * <p>
 * MySQL 为权威数据源，Redis 作为读加速缓存，容忍短暂不一致（最终一致）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBitmapService {

    private static final String OCCUPIED_PREFIX = "schedule:seat:occupied:";
    private static final String SOLD_PREFIX = "schedule:seat:sold:";

    private final StringRedisTemplate redisTemplate;

    private String occupiedKey(Long scheduleId) {
        return OCCUPIED_PREFIX + scheduleId;
    }

    private String soldKey(Long scheduleId) {
        return SOLD_PREFIX + scheduleId;
    }

    /**
     * 初始化空 Bitmap（全 0），仅在 Key 不存在时创建。
     */
    public void initBitmap(Long scheduleId, int totalSeats) {
        try {
            String occKey = occupiedKey(scheduleId);
            String soldKey = soldKey(scheduleId);
            if (!redisTemplate.hasKey(occKey)) {
                redisTemplate.opsForValue().setBit(occKey, totalSeats - 1, false);
            }
            if (!redisTemplate.hasKey(soldKey)) {
                redisTemplate.opsForValue().setBit(soldKey, totalSeats - 1, false);
            }
            log.debug("Initialized bitmap for schedule {}", scheduleId);
        } catch (Exception e) {
            log.warn("Failed to init bitmap for schedule {}: {}", scheduleId, e.getMessage());
        }
    }

    /**
     * 从 MySQL 重建 Bitmap（全量覆盖）。
     */
    public void rebuildBitmap(Long scheduleId, List<ScheduleSeat> seats) {
        try {
            String occKey = occupiedKey(scheduleId);
            String soldKey = soldKey(scheduleId);
            redisTemplate.delete(occKey);
            redisTemplate.delete(soldKey);

            for (ScheduleSeat seat : seats) {
                int idx = seat.getSeatIndex();
                String status = seat.getStatus();
                if (ScheduleSeatStatus.LOCKED.getCode().equals(status) || ScheduleSeatStatus.SOLD.getCode().equals(status)) {
                    redisTemplate.opsForValue().setBit(occKey, idx, true);
                }
                if (ScheduleSeatStatus.SOLD.getCode().equals(status)) {
                    redisTemplate.opsForValue().setBit(soldKey, idx, true);
                }
            }
            log.debug("Rebuilt bitmap for schedule {} with {} seats", scheduleId, seats.size());
        } catch (Exception e) {
            log.warn("Failed to rebuild bitmap for schedule {}: {}", scheduleId, e.getMessage());
        }
    }

    /**
     * 删除 Bitmap 缓存。
     */
    public void deleteBitmap(Long scheduleId) {
        try {
            redisTemplate.delete(occupiedKey(scheduleId));
            redisTemplate.delete(soldKey(scheduleId));
            log.debug("Deleted bitmap for schedule {}", scheduleId);
        } catch (Exception e) {
            log.warn("Failed to delete bitmap for schedule {}: {}", scheduleId, e.getMessage());
        }
    }

    /**
     * 锁座：SETBIT occupied=1
     */
    public void setOccupied(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(occupiedKey(scheduleId), seatIndex, true);
        } catch (Exception e) {
            log.warn("Failed to set occupied bit for schedule {} seat {}: {}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 支付：SETBIT sold=1
     */
    public void setSold(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(soldKey(scheduleId), seatIndex, true);
        } catch (Exception e) {
            log.warn("Failed to set sold bit for schedule {} seat {}: {}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 取消/超时释放：SETBIT occupied=0（仅当 sold 位为 0 时执行）
     */
    public void clearOccupiedIfNotSold(Long scheduleId, int seatIndex) {
        try {
            Boolean isSold = redisTemplate.opsForValue().getBit(soldKey(scheduleId), seatIndex);
            if (isSold == null || !isSold) {
                redisTemplate.opsForValue().setBit(occupiedKey(scheduleId), seatIndex, false);
            }
        } catch (Exception e) {
            log.warn("Failed to clear occupied bit for schedule {} seat {}: {}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 退票释放：SETBIT sold=0 + SETBIT occupied=0
     */
    public void clearSoldAndOccupied(Long scheduleId, int seatIndex) {
        try {
            redisTemplate.opsForValue().setBit(soldKey(scheduleId), seatIndex, false);
            redisTemplate.opsForValue().setBit(occupiedKey(scheduleId), seatIndex, false);
        } catch (Exception e) {
            log.warn("Failed to clear sold+occupied bits for schedule {} seat {}: {}", scheduleId, seatIndex, e.getMessage());
        }
    }

    /**
     * 检查 Bitmap 是否存在（缓存是否命中）。
     */
    public boolean bitmapExists(Long scheduleId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(occupiedKey(scheduleId)));
        } catch (Exception e) {
            log.warn("Failed to check bitmap existence for schedule {}: {}", scheduleId, e.getMessage());
            return false;
        }
    }

    /**
     * 从 Bitmap 获取座位状态。缓存未命中返回 null，调用方应降级查 MySQL。
     */
    public String getSeatStatus(Long scheduleId, int seatIndex) {
        try {
            if (!bitmapExists(scheduleId)) {
                return null;
            }
            Boolean occupied = redisTemplate.opsForValue().getBit(occupiedKey(scheduleId), seatIndex);
            Boolean sold = redisTemplate.opsForValue().getBit(soldKey(scheduleId), seatIndex);
            if (sold != null && sold) {
                return ScheduleSeatStatus.SOLD.getCode();
            }
            if (occupied != null && occupied) {
                return ScheduleSeatStatus.LOCKED.getCode();
            }
            return ScheduleSeatStatus.AVAILABLE.getCode();
        } catch (Exception e) {
            log.warn("Failed to get seat status from bitmap for schedule {} seat {}: {}", scheduleId, seatIndex, e.getMessage());
            return null;
        }
    }

    /**
     * 批量获取所有座位状态。返回数组下标 = seatIndex，值为状态码。
     * 缓存未命中返回 null。
     */
    public String[] getSeatStatuses(Long scheduleId, int totalSeats) {
        try {
            if (!bitmapExists(scheduleId)) {
                return null;
            }
            String occKey = occupiedKey(scheduleId);
            String soldKey = soldKey(scheduleId);
            String[] statuses = new String[totalSeats];
            for (int i = 0; i < totalSeats; i++) {
                statuses[i] = ScheduleSeatStatus.AVAILABLE.getCode();
            }
            // 批量读取 occupied bitmap
            String occVal = redisTemplate.opsForValue().get(occKey);
            byte[] occBits = occVal != null ? occVal.getBytes() : null;
            String soldVal = redisTemplate.opsForValue().get(soldKey);
            byte[] soldBits = soldVal != null ? soldVal.getBytes() : null;
            for (int i = 0; i < totalSeats; i++) {
                boolean occupied = getBit(occBits, i);
                boolean sold = getBit(soldBits, i);
                if (sold) {
                    statuses[i] = ScheduleSeatStatus.SOLD.getCode();
                } else if (occupied) {
                    statuses[i] = ScheduleSeatStatus.LOCKED.getCode();
                }
            }
            return statuses;
        } catch (Exception e) {
            log.warn("Failed to get seat statuses from bitmap for schedule {}: {}", scheduleId, e.getMessage());
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
     * 从 Bitmap BITCOUNT 获取已占用座位数。
     */
    public long getOccupiedCount(Long scheduleId) {
        try {
            if (!bitmapExists(scheduleId)) {
                return -1;
            }
            Long count = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Long>) connection -> connection.bitCount(occupiedKey(scheduleId).getBytes()));
            return count != null ? count : -1;
        } catch (Exception e) {
            log.warn("Failed to get occupied count for schedule {}: {}", scheduleId, e.getMessage());
            return -1;
        }
    }

    /**
     * 从 Bitmap BITCOUNT 获取已售座位数。
     */
    public long getSoldCount(Long scheduleId) {
        try {
            if (!redisTemplate.hasKey(soldKey(scheduleId))) {
                return -1;
            }
            Long count = redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Long>) connection -> connection.bitCount(soldKey(scheduleId).getBytes()));
            return count != null ? count : -1;
        } catch (Exception e) {
            log.warn("Failed to get sold count for schedule {}: {}", scheduleId, e.getMessage());
            return -1;
        }
    }
}
