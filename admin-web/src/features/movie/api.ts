import request, { type PageResult } from '../../shared/utils/request';
import type {
  MovieRecord,
  MovieDetail,
  MovieListParams,
  MovieCreateParams,
  BatchResult,
} from './types';

export type { MovieRecord, MovieDetail, MovieListParams, MovieCreateParams, BatchResult } from './types';

/**
 * 影片管理 API
 * 对应后端接口：/api/v1/admin/movies/*
 */
export const movieApi = {
  /**
   * 查询影片列表（分页）
   * GET /api/v1/admin/movies
   * @param params - 查询参数（关键词、类型、状态、分页、排序）
   * @returns 分页结果
   */
  getMovieList: (params: MovieListParams): Promise<PageResult<MovieRecord>> =>
    request.get('/movies', { params }),

  /**
   * 查询影片详情
   * GET /api/v1/admin/movies/{id}
   * 返回完整字段（含导演、主演、简介等）
   * @param id - 影片 ID
   * @returns 影片详情
   */
  getMovieDetail: (id: string): Promise<MovieDetail> =>
    request.get(`/movies/${id}`),

  /**
   * 新增影片
   * POST /api/v1/admin/movies
   * @param data - 影片创建参数
   * @returns 新创建的影片详情
   */
  createMovie: (data: MovieCreateParams): Promise<MovieDetail> =>
    request.post('/movies', data),

  /**
   * 编辑影片
   * PUT /api/v1/admin/movies/{id}
   * @param id - 影片 ID
   * @param data - 影片更新参数
   * @returns 更新后的影片详情
   */
  updateMovie: (id: string, data: MovieCreateParams): Promise<MovieDetail> =>
    request.put(`/movies/${id}`, data),

  /**
   * 上架影片（单个）
   * PUT /api/v1/admin/movies/{id}/publish
   * @param id - 影片 ID
   */
  publishMovie: (id: string): Promise<void> =>
    request.put(`/movies/${id}/publish`),

  /**
   * 批量上架影片
   * PUT /api/v1/admin/movies/batch-publish
   * @param ids - 影片 ID 数组
   * @returns 批量操作结果（成功/失败 ID 列表）
   */
  batchPublishMovies: (ids: string[]): Promise<BatchResult> =>
    request.put('/movies/batch-publish', { ids }),

  /**
   * 下架影片（单个）
   * PUT /api/v1/admin/movies/{id}/unpublish
   * @param id - 影片 ID
   */
  unpublishMovie: (id: string): Promise<void> =>
    request.put(`/movies/${id}/unpublish`),

  /**
   * 批量下架影片
   * PUT /api/v1/admin/movies/batch-unpublish
   * @param ids - 影片 ID 数组
   * @returns 批量操作结果（成功/失败 ID 列表）
   */
  batchUnpublishMovies: (ids: string[]): Promise<BatchResult> =>
    request.put('/movies/batch-unpublish', { ids }),

  /**
   * 上传海报图片到 OSS
   * POST /api/v1/admin/upload/image
   * 使用 multipart/form-data 格式上传
   * @param file - 图片文件
   * @returns { objectKey } - OSS 对象 key（用于后续海报 URL 拼接）
   */
  uploadImage: (file: File): Promise<{ objectKey: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
