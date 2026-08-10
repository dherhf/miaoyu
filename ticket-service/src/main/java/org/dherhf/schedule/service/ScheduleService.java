package org.dherhf.schedule.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.schedule.dto.ScheduleCreateDTO;
import org.dherhf.schedule.dto.ScheduleUpdateDTO;
import org.dherhf.schedule.vo.ScheduleDetailVO;
import org.dherhf.schedule.vo.ScheduleListVO;
import org.dherhf.schedule.vo.ScheduleVO;
import org.dherhf.schedule.vo.SeatMapVO;

/**
 * 场次服务接口。
 * <p>
 * 定义场次的增删改查、取消/恢复/结束、用户端列表/详情/座位图、自动结束过期场次等核心能力。
 */
public interface ScheduleService {

    /**
     * 新增场次排片，校验影片/影院/影厅有效性后创建场次并批量生成座位。
     *
     * @param dto 场次创建请求 DTO
     * @return 场次信息视图对象
     */
    ScheduleVO createSchedule(ScheduleCreateDTO dto);

    /**
     * 编辑场次，已有售票时不可修改核心字段（影厅/日期/时间）。
     *
     * @param id  场次 ID
     * @param dto 场次更新请求 DTO
     * @return 更新后的场次信息视图对象
     */
    ScheduleVO updateSchedule(Long id, ScheduleUpdateDTO dto);

    /**
     * 取消场次，释放锁定座位并取消关联待支付订单。
     *
     * @param id 场次 ID
     */
    void cancelSchedule(Long id);

    /**
     * 恢复已取消的场次，校验日期未过期且无排片冲突。
     *
     * @param id 场次 ID
     */
    void restoreSchedule(Long id);

    /**
     * 结束场次，释放锁定座位、将已出票订单置为已过期。
     *
     * @param id 场次 ID
     */
    void endSchedule(Long id);

    /**
     * 删除场次（仅非在售且无已售票时可删除）。
     *
     * @param id 场次 ID
     */
    void deleteSchedule(Long id);

    /**
     * 管理端场次分页查询，支持按影片/影院/影厅/日期/状态筛选。
     *
     * @param movieId  影片 ID（可选）
     * @param cinemaId 影院 ID（可选）
     * @param hallId   影厅 ID（可选）
     * @param showDate 放映日期（可选）
     * @param status   场次状态（可选）
     * @param page     页码
     * @param size     每页条数
     * @return 分页的场次列表结果
     */
    PageResult<ScheduleListVO> adminList(Long movieId, Long cinemaId, Long hallId, String showDate, String status, Integer page, Integer size);

    /**
     * 管理端场次详情查询。
     *
     * @param id 场次 ID
     * @return 场次详情视图对象
     */
    ScheduleDetailVO adminDetail(Long id);

    /**
     * 用户端场次分页查询，仅返回可售场次，支持按影片名模糊搜索。
     *
     * @param movieId   影片 ID（可选）
     * @param movieName 影片名称（可选，模糊匹配）
     * @param cinemaId  影院 ID（可选）
     * @param showDate  放映日期（可选）
     * @param page      页码
     * @param size      每页条数
     * @return 分页的场次列表结果
     */
    PageResult<ScheduleListVO> userList(Long movieId, String movieName, Long cinemaId, String showDate, Integer page, Integer size);

    /**
     * 用户端场次详情查询，仅可售场次返回。
     *
     * @param id 场次 ID
     * @return 场次详情视图对象
     */
    ScheduleDetailVO userDetail(Long id);

    /**
     * 获取场次座位图，优先从 Redis Bitmap 读取座位状态，缓存未命中时从 MySQL 重建。
     *
     * @param id 场次 ID
     * @return 座位图视图对象
     */
    SeatMapVO getSeatMap(Long id);

    /**
     * 定时自动结束已过期的在售场次（每 10 分钟执行）。
     */
    void autoEndExpiredSchedules();
}
