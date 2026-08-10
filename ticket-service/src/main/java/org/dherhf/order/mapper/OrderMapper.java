package org.dherhf.order.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.dherhf.order.entity.Order;

import java.time.LocalDateTime;

/**
 * 订单数据访问层接口，继承 MyBatis-Plus {@link BaseMapper}。
 * <p>
 * 除基础 CRUD 外，提供基于 CAS 条件更新的原子状态变更方法，
 * 保证并发安全：仅在当前状态匹配时才更新。
 */
@Mapper
public interface OrderMapper extends BaseMapper<Order> {

    /**
     * 条件 UPDATE：仅当订单状态为 PENDING 时更新为 PAID。
     * 返回受影响行数，0 表示状态已被并发修改。
     *
     * @param orderId 订单 ID
     * @param paidAt   支付完成时间
     * @return 受影响行数，1 表示更新成功，0 表示状态已被并发修改
     */
    @Update("UPDATE orders SET status = 'PAID', paid_at = #{paidAt}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PENDING'")
    int updateToPaidIfPending(@Param("orderId") Long orderId, @Param("paidAt") LocalDateTime paidAt);

    /**
     * 条件 UPDATE：仅当订单状态为 PENDING 时更新为 CANCELLED。
     * 返回受影响行数，0 表示状态已被并发修改。
     *
     * @param orderId       订单 ID
     * @param cancelledAt   取消时间
     * @param cancelReason  取消原因
     * @return 受影响行数，1 表示更新成功，0 表示状态已被并发修改
     */
    @Update("UPDATE orders SET status = 'CANCELLED', cancelled_at = #{cancelledAt}, " +
            "cancel_reason = #{cancelReason}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PENDING'")
    int updateToCancelledIfPending(@Param("orderId") Long orderId,
                                   @Param("cancelledAt") LocalDateTime cancelledAt,
                                   @Param("cancelReason") String cancelReason);

    /**
     * 条件 UPDATE：仅当订单状态为 PAID 时更新为 REFUNDED。
     * 返回受影响行数，0 表示状态已被并发修改。
     *
     * @param orderId       订单 ID
     * @param cancelledAt   退票时间
     * @param cancelReason  退票原因
     * @return 受影响行数，1 表示更新成功，0 表示状态已被并发修改
     */
    @Update("UPDATE orders SET status = 'REFUNDED', cancelled_at = #{cancelledAt}, " +
            "cancel_reason = #{cancelReason}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PAID'")
    int updateToRefundedIfPaid(@Param("orderId") Long orderId,
                              @Param("cancelledAt") LocalDateTime cancelledAt,
                              @Param("cancelReason") String cancelReason);

    /**
     * 条件 UPDATE：仅当订单状态为 PAID 时更新为 CHECKED。
     * 返回受影响行数，0 表示状态已被并发修改。
     *
     * @param orderId    订单 ID
     * @param checkedAt  检票时间
     * @return 受影响行数，1 表示更新成功，0 表示状态已被并发修改
     */
    @Update("UPDATE orders SET status = 'CHECKED', checked_at = #{checkedAt}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PAID'")
    int updateToCheckedIfPaid(@Param("orderId") Long orderId,
                              @Param("checkedAt") LocalDateTime checkedAt);
}
