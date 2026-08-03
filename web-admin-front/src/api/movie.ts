import request, { type PageResult } from '../utils/request';
import type {
  MovieRecord,
  MovieDetail,
  MovieListParams,
  MovieCreateParams,
  BatchResult,
} from '../types/movie';

export type { MovieRecord, MovieDetail, MovieListParams, MovieCreateParams, BatchResult } from '../types/movie';

// ===================== API =====================

/** 查询影片列表 */
export function getMovieList(params: MovieListParams): Promise<PageResult<MovieRecord>> {
  return request.get('/movies', { params });
}

/** 查询影片详情 */
export function getMovieDetail(id: number): Promise<MovieDetail> {
  return request.get(`/movies/${id}`);
}

/** 新增影片 */
export function createMovie(data: MovieCreateParams): Promise<MovieDetail> {
  return request.post('/movies', data);
}

/** 编辑影片 */
export function updateMovie(id: number, data: MovieCreateParams): Promise<MovieDetail> {
  return request.put(`/movies/${id}`, data);
}

/** 上架影片 */
export function publishMovie(id: number): Promise<null> {
  return request.put(`/movies/${id}/publish`);
}

/** 批量上架 */
export function batchPublishMovies(ids: number[]): Promise<BatchResult> {
  return request.put('/movies/batch-publish', { ids });
}

/** 下架影片 */
export function unpublishMovie(id: number): Promise<null> {
  return request.put(`/movies/${id}/unpublish`);
}

/** 批量下架 */
export function batchUnpublishMovies(ids: number[]): Promise<BatchResult> {
  return request.put('/movies/batch-unpublish', { ids });
}
