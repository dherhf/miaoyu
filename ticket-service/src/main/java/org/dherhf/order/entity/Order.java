package org.dherhf.order.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 订单实体，映射数据库表 {@code orders}。
 * <p>
 * 记录一次购票交易的完整信息：影片、影院、影厅、场次时间、座位、
 * 票数、金额及订单状态流转。状态枚举见 {@link org.dherhf.order.enums.OrderStatus}。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("orders")
public class Order {

    /** 订单自增主键 ID */
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 订单号（时间戳+随机数生成，全局唯一） */
    private String orderNo;

    /** 下单用户 ID */
    private Long userId;

    /** 关联场次 ID */
    private Long scheduleId;

    /** 影片名称（冗余存储，避免联表查询） */
    private String movieName;

    /** 影院名称（冗余存储） */
    private String cinemaName;

    /** 影厅名称（冗余存储） */
    private String hallName;

    /** 放映日期 */
    private LocalDate showDate;

    /** 开场时间 */
    private LocalTime startTime;

    /** 座位信息（逗号分隔的座位标签，如 "3排5号,3排6号"） */
    private String seatInfo;

    /** 购票数量 */
    private Integer ticketCount;

    /** 订单总金额（票价 × 票数） */
    private BigDecimal totalAmount;

    /** 订单状态：pending 待支付 / paid 已出票 / cancelled 已取消 / refunded 已退票 / checked 已检票 / expired 已过期 */
    private String status;

    /** 取消原因 */
    private String cancelReason;

    /** 订单创建时间（锁座时间） */
    private LocalDateTime createdAt;

    /** 支付时间 */
    private LocalDateTime paidAt;

    /** 取消时间 */
    private LocalDateTime cancelledAt;

    /** 检票时间 */
    private LocalDateTime checkedAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
