// ===================== 影片相关类型 =====================

// ---------- API 层 ----------

/** 影片列表记录 */
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

/** 影片详情 */
export interface MovieDetail extends MovieRecord {
  director?: string;
  actors?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 影片列表查询参数 */
export interface MovieListParams {
  keyword?: string;
  type?: string;
  status?: number;
  page?: number;
  size?: number;
  sort?: string;
}

/** 新增/编辑影片参数 */
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

/** 批量操作结果 */
export interface BatchResult {
  successIds: number[];
  failIds: number[];
  failReasons: Record<string, string>;
}

// ---------- Store 层 ----------

/** 影片上下架状态 */
export type MovieStatus = 'showing' | 'offline';

/** 影片条目（Store / 页面展示用） */
export interface MovieItem {
  id: number;
  name: string;
  types: string[];
  posterUrl: string;
  rating: number | null;
  duration: number;
  releaseDate: string;
  director: string;
  actors: string;
  description: string;
  status: MovieStatus;
}

// ---------- 表单层 ----------

/** 影片表单值 */
export interface MovieFormValues {
  name: string;
  types: string[];
  posterUrl: string;
  rating: number | null;
  duration: number;
  releaseDate: string;
  director: string;
  actors: string;
  description: string;
  status: MovieStatus;
}

// ---------- 映射函数 ----------

/** API status (1=上架 0=下架) → MovieStatus */
export function mapMovieStatus(status: number): MovieStatus {
  return status === 1 ? 'showing' : 'offline';
}

/** MovieStatus → API status (1=上架 0=下架) */
export function toApiStatus(status: MovieStatus): number {
  return status === 'showing' ? 1 : 0;
}

/** MovieRecord → MovieItem */
export function mapMovieRecord(record: MovieRecord): MovieItem {
  return {
    id: record.id,
    name: record.name,
    types: record.types ?? [],
    posterUrl: record.posterUrl ?? '',
    rating: record.rating ?? null,
    duration: record.duration,
    releaseDate: record.releaseDate,
    director: (record as MovieDetail).director ?? '',
    actors: (record as MovieDetail).actors ?? '',
    description: (record as MovieDetail).description ?? '',
    status: mapMovieStatus(record.status),
  };
}
