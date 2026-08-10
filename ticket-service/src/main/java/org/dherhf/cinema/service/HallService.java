package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.dto.HallCreateDTO;
import org.dherhf.cinema.dto.HallLayoutDTO;
import org.dherhf.cinema.dto.HallUpdateDTO;
import org.dherhf.cinema.vo.HallDetailVO;
import org.dherhf.cinema.vo.HallListVO;
import org.dherhf.cinema.vo.HallVO;
import org.dherhf.cinema.vo.LayoutResultVO;

/**
 * 影厅服务接口,定义影厅的增删改查及座位布局管理业务方法。
 */
public interface HallService {

    /**
     * 新增影厅。
     *
     * @param dto 影厅创建请求
     * @return 新创建的影厅信息
     */
    HallVO createHall(HallCreateDTO dto);

    /**
     * 分页查询影厅列表,支持按影院、名称、银幕类型、状态筛选。
     *
     * @param cinemaId   影院 ID（可选）
     * @param name       影厅名称,模糊匹配（可选）
     * @param screenType 银幕类型（可选）
     * @param status     影厅状态（可选）
     * @param page       页码
     * @param size       每页条数
     * @return 分页影厅列表
     */
    PageResult<HallListVO> list(Long cinemaId, String name, String screenType, Integer status, Integer page, Integer size);

    /**
     * 查询影厅详情,包含座位布局信息。
     *
     * @param id 影厅 ID
     * @return 影厅详细信息,包含座位格子列表
     */
    HallDetailVO detail(Long id);

    /**
     * 更新影厅基本信息。
     *
     * @param id  影厅 ID
     * @param dto 影厅更新请求
     * @return 更新后的影厅信息
     */
    HallVO updateHall(Long id, HallUpdateDTO dto);

    /**
     * 保存影厅座位布局。
     *
     * @param id  影厅 ID
     * @param dto 座位布局请求,包含行列数和座位格子列表
     * @return 布局保存结果,包含总座位数和更新时间
     */
    LayoutResultVO saveLayout(Long id, HallLayoutDTO dto);

    /**
     * 删除影厅,同时删除关联的座位格子数据。
     *
     * @param id 影厅 ID
     */
    void deleteHall(Long id);
}
