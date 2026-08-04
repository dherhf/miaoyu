import request, { type PageResult } from '../../shared/utils/request';
import type {
  MovieRecord,
  MovieDetail,
  MovieListParams,
  MovieCreateParams,
  BatchResult,
} from './types';

export type { MovieRecord, MovieDetail, MovieListParams, MovieCreateParams, BatchResult } from './types';

export const movieApi = {
  /** 查询影片列表 */
  getMovieList: (params: MovieListParams): Promise<PageResult<MovieRecord>> =>
    request.get('/movies', { params }),

  /** 查询影片详情 */
  getMovieDetail: (id: string): Promise<MovieDetail> =>
    request.get(`/movies/${id}`),

  /** 新增影片 */
  createMovie: (data: MovieCreateParams): Promise<MovieDetail> =>
    request.post('/movies', data),

  /** 编辑影片 */
  updateMovie: (id: string, data: MovieCreateParams): Promise<MovieDetail> =>
    request.put(`/movies/${id}`, data),

  /** 上架影片 */
  publishMovie: (id: string): Promise<void> =>
    request.put(`/movies/${id}/publish`),

  /** 批量上架 */
  batchPublishMovies: (ids: string[]): Promise<BatchResult> =>
    request.put('/movies/batch-publish', { ids }),

  /** 下架影片 */
  unpublishMovie: (id: string): Promise<void> =>
    request.put(`/movies/${id}/unpublish`),

  /** 批量下架 */
  batchUnpublishMovies: (ids: string[]): Promise<BatchResult> =>
    request.put('/movies/batch-unpublish', { ids }),
};
