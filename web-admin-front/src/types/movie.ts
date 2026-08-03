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
}

/** 影片列表查询参数 */
export interface MovieListParams {
  keyword?: string;
  type?: string;
  status?: number;
  page?: number;
  size?: number;
  sort?: 'releaseDateDesc' | 'ratingDesc';
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
  failReasons: Record<number, string>;
}

// ---------- Store 层 ----------

/** 影片上下架状态 */
export type MovieStatus = 'showing' | 'offline';

/** 影片条目（Store / 页面展示用） */
export interface MovieItem {
  id: number | string;
  name: string;
  types: string[];
  typeLabel: string;
  poster_url: string;
  rating: number | null;
  duration: number;
  release_date: string;
  director: string;
  actors: string;
  description: string;
  status: MovieStatus;
  hasSchedule?: boolean;
}

/** 影片筛选条件 */
export interface MovieFilters {
  keyword: string;
  type?: string;
  status?: string;
}
