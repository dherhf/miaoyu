package org.dherhf.movie.service;

import org.dherhf.common.result.PageResult;
import org.dherhf.order.dto.BatchIdsDTO;
import org.dherhf.movie.dto.MovieCreateDTO;
import org.dherhf.movie.dto.MovieUpdateDTO;
import org.dherhf.order.vo.BatchOperateVO;
import org.dherhf.movie.vo.MovieListVO;
import org.dherhf.movie.vo.MovieVO;

/**
 * 影片服务接口。
 * <p>
 * 定义影片管理的核心业务方法，包括增删改查、上下架、批量操作，
 * 以及管理端和用户端不同的查询逻辑。
 */
public interface MovieService {

    /**
     * 新增影片，创建后默认为下架状态。
     *
     * @param dto 影片创建参数
     * @return 创建后的影片详情
     */
    MovieVO createMovie(MovieCreateDTO dto);

    /**
     * 编辑影片信息。
     *
     * @param id  影片 ID
     * @param dto 影片更新参数
     * @return 更新后的影片详情
     */
    MovieVO updateMovie(Long id, MovieUpdateDTO dto);

    /**
     * 上架影片。
     *
     * @param id 影片 ID
     */
    void publishMovie(Long id);

    /**
     * 下架影片，若存在未放映的在售场次则不允许下架。
     *
     * @param id 影片 ID
     */
    void unpublishMovie(Long id);

    /**
     * 批量上架影片。
     *
     * @param dto 包含影片 ID 列表的请求体
     * @return 批量操作结果（成功/失败 ID 及失败原因）
     */
    BatchOperateVO batchPublish(BatchIdsDTO dto);

    /**
     * 批量下架影片。
     *
     * @param dto 包含影片 ID 列表的请求体
     * @return 批量操作结果（成功/失败 ID 及失败原因）
     */
    BatchOperateVO batchUnpublish(BatchIdsDTO dto);

    /**
     * 管理端影片列表查询，可查看所有状态的影片。
     *
     * @param keyword 搜索关键词
     * @param type    影片类型
     * @param status  影片状态
     * @param page    页码
     * @param size    每页条数
     * @param sort    排序字段
     * @return 分页影片列表
     */
    PageResult<MovieListVO> adminList(String keyword, String type, Integer status, Integer page, Integer size, String sort);

    /**
     * 管理端影片详情查询，不限制影片状态。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    MovieVO adminDetail(Long id);

    /**
     * 用户端影片列表查询，仅返回已上架且有在售场次的影片。
     *
     * @param keyword  搜索关键词
     * @param type     影片类型
     * @param cinemaId 影院 ID
     * @param date     日期
     * @param page     页码
     * @param size     每页条数
     * @param sort     排序字段
     * @return 分页影片列表
     */
    PageResult<MovieListVO> userList(String keyword, String type, Long cinemaId, String date, Integer page, Integer size, String sort);

    /**
     * 用户端影片详情查询，仅返回已上架影片。
     *
     * @param id 影片 ID
     * @return 影片详情
     */
    MovieVO userDetail(Long id);
}
