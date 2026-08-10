package org.dherhf.cinema.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.cinema.dto.CinemaCreateDTO;
import org.dherhf.cinema.dto.CinemaUpdateDTO;
import org.dherhf.cinema.vo.CinemaListVO;
import org.dherhf.cinema.vo.CinemaUserListVO;
import org.dherhf.cinema.vo.CinemaVO;

import java.math.BigDecimal;

/**
 * 影院服务接口,定义影院管理端与用户端的增删改查业务方法。
 */
public interface CinemaService {

    /**
     * 新增影院。
     *
     * @param dto 影院创建请求
     * @return 新创建的影院信息
     */
    CinemaVO createCinema(CinemaCreateDTO dto);

    /**
     * 更新影院信息。
     *
     * @param id  影院 ID
     * @param dto 影院更新请求
     * @return 更新后的影院信息
     */
    CinemaVO updateCinema(Long id, CinemaUpdateDTO dto);

    /**
     * 影院停业。
     *
     * @param id 影院 ID
     */
    void closeCinema(Long id);

    /**
     * 影院营业。
     *
     * @param id 影院 ID
     */
    void openCinema(Long id);

    /**
     * 分页查询影院列表（管理端）。
     *
     * @param keyword 搜索关键词（可选）
     * @param status  影院状态（可选）
     * @param page    页码
     * @param size    每页条数
     * @return 分页影院列表（管理端视图）
     */
    PageResult<CinemaListVO> adminList(String keyword, Integer status, Integer page, Integer size);

    /**
     * 查询影院详情（管理端）。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     */
    CinemaVO adminDetail(Long id);

    /**
     * 分页查询影院列表（用户端）,支持经纬度距离排序与影片筛选。
     *
     * @param longitude 用户经度（可选）
     * @param latitude  用户纬度（可选）
     * @param movieId   影片 ID（可选）
     * @param keyword   搜索关键词（可选）
     * @param page      页码
     * @param size      每页条数
     * @return 分页影院列表（用户端视图）
     */
    PageResult<CinemaUserListVO> userList(BigDecimal longitude, BigDecimal latitude, Long movieId, String keyword, Integer page, Integer size);

    /**
     * 查询影院详情（用户端）,仅返回营业中的影院。
     *
     * @param id 影院 ID
     * @return 影院详细信息
     */
    CinemaVO userDetail(Long id);
}
