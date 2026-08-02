package org.dherhf.order.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.dherhf.order.vo.AdminOrderDetailVO;
import org.dherhf.order.vo.AdminOrderListVO;
import org.dherhf.cinema.vo.AdminSeatVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.entity.HallCell;
import org.dherhf.order.entity.Order;
import org.dherhf.schedule.entity.ScheduleSeat;
import org.dherhf.auth.entity.User;
import org.dherhf.cinema.mapper.HallCellMapper;
import org.dherhf.order.mapper.OrderMapper;
import org.dherhf.schedule.mapper.ScheduleSeatMapper;
import org.dherhf.auth.mapper.UserMapper;
import org.dherhf.common.util.CryptoUtil;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminOrderServiceImpl implements AdminOrderService {

    private final OrderMapper orderMapper;
    private final UserMapper userMapper;
    private final ScheduleSeatMapper scheduleSeatMapper;
    private final HallCellMapper hallCellMapper;
    private final CryptoUtil cryptoUtil;

    @Override
    public PageResult<AdminOrderListVO> list(String orderNo, String movieName, String cinemaName, String status, String dateFrom, String dateTo, Integer page, Integer size) {
        Page<Order> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .eq(orderNo != null && !orderNo.isBlank(), Order::getOrderNo, orderNo)
                .like(movieName != null && !movieName.isBlank(), Order::getMovieName, movieName)
                .like(cinemaName != null && !cinemaName.isBlank(), Order::getCinemaName, cinemaName)
                .eq(status != null && !status.isBlank(), Order::getStatus, status)
                .ge(dateFrom != null && !dateFrom.isBlank(), Order::getCreatedAt, parseDateTime(dateFrom))
                .le(dateTo != null && !dateTo.isBlank(), Order::getCreatedAt, parseDateTime(dateTo))
                .orderByDesc(Order::getCreatedAt);

        IPage<Order> result = orderMapper.selectPage(pageParam, wrapper);
        List<AdminOrderListVO> records = result.getRecords().stream()
                .map(this::toListVO)
                .collect(Collectors.toList());

        return new PageResult<>(result.getTotal(), page, size, records);
    }

    @Override
    public AdminOrderDetailVO detail(Long id) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }

        AdminOrderDetailVO vo = new AdminOrderDetailVO();
        BeanUtils.copyProperties(order, vo);

        // 查询用户手机号并脱敏
        vo.setUserPhone(getMaskedPhone(order.getUserId()));

        // 查询座位详情
        List<ScheduleSeat> scheduleSeats = scheduleSeatMapper.selectList(
                new LambdaQueryWrapper<ScheduleSeat>().eq(ScheduleSeat::getOrderId, id));
        List<AdminSeatVO> seats = new ArrayList<>();
        for (ScheduleSeat ss : scheduleSeats) {
            if (ss.getHallCellId() != null) {
                HallCell cell = hallCellMapper.selectById(ss.getHallCellId());
                if (cell != null) {
                    AdminSeatVO seatVO = new AdminSeatVO();
                    seatVO.setSeatLabel(cell.getSeatLabel());
                    seatVO.setStatus(ss.getStatus());
                    seats.add(seatVO);
                }
            }
        }
        vo.setSeats(seats);

        // TODO: 超级管理员可查看完整手机号
        return vo;
    }

    private AdminOrderListVO toListVO(Order order) {
        AdminOrderListVO vo = new AdminOrderListVO();
        BeanUtils.copyProperties(order, vo);
        vo.setUserPhone(getMaskedPhone(order.getUserId()));
        return vo;
    }

    private String getMaskedPhone(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getPhone() == null) {
            return null;
        }
        String phone;
        try {
            phone = CryptoUtil.decrypt(user.getPhone());
        } catch (Exception e) {
            phone = user.getPhone();
        }
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private LocalDateTime parseDateTime(String dateStr) {
        return LocalDateTime.parse(dateStr + " 00:00:00", DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
