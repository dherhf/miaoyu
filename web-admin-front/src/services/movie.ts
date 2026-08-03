import request, { type PageResult } from '../utils/request';

// ===================== 类型 =====================
export interface MovieRecord {
  id: number;
  name: string;
  types: string[];
  posterUrl: string;
  rating: number;
  duration: number;
  releaseDate: string;
  status: number; // 1=上架 0=下架
}

export interface MovieDetail extends MovieRecord {
  director?: string;
  actors?: string;
  description?: string;
}

export interface MovieListParams {
  keyword?: string;
  type?: string;
  status?: number;
  page?: number;
  size?: number;
  sort?: 'releaseDateDesc' | 'ratingDesc';
}

export interface MovieCreateParams {
  name: string;
  types: string[];
  posterUrl: string;
  rating: number;
  duration: number;
  releaseDate: string;
  director?: string;
  actors?: string;
  description?: string;
}

export interface BatchResult {
  successIds: number[];
  failIds: number[];
  failReasons: Record<number, string>;
}

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
