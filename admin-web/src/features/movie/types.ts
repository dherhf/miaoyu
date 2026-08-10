// ===================== 影片相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 影片列表记录（API 返回） */
export interface MovieRecord {
  /** 影片 ID */
  id: string;
  /** 影片名称 */
  name: string;
  /** 影片类型列表 */
  types: string[];
  /** 海报 URL */
  posterUrl: string;
  /** 评分（0-10） */
  rating: number;
  /** 时长（分钟） */
  duration: number;
  /** 上映日期（YYYY-MM-DD） */
  releaseDate: string;
  /** 状态：1=上架 0=下架 */
  status: number;
}

/** 影片详情（含导演、主演、简介等额外字段） */
export interface MovieDetail extends MovieRecord {
  /** 导演 */
  director?: string;
  /** 主演 */
  actors?: string;
  /** 影片简介 */
  description?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/** 影片列表查询参数 */
export interface MovieListParams {
  /** 搜索关键词（影片名称） */
  keyword?: string;
  /** 影片类型筛选 */
  type?: string;
  /** 状态筛选：1=上架 0=下架 */
  status?: number;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  size?: number;
  /** 排序字段 */
  sort?: string;
}

/** 新增/编辑影片参数 */
export interface MovieCreateParams {
  /** 影片名称 */
  name: string;
  /** 影片类型列表 */
  types: string[];
  /** 海报 URL（OSS objectKey） */
  posterUrl: string;
  /** 评分 */
  rating: number;
  /** 时长（分钟） */
  duration: number;
  /** 上映日期（YYYY-MM-DD） */
  releaseDate: string;
  /** 导演 */
  director?: string;
  /** 主演 */
  actors?: string;
  /** 影片简介 */
  description?: string;
}

/** 批量操作结果 */
export interface BatchResult {
  /** 成功的 ID 列表 */
  successIds: string[];
  /** 失败的 ID 列表 */
  failIds: string[];
  /** 失败原因映射（ID → 原因） */
  failReasons: Record<string, string>;
}

// ---------- Store 层（前端展示用类型）----------

/** 影片上下架状态 */
export type MovieStatus = 'showing' | 'offline';

/** 影片条目（Store / 页面展示用） */
export interface MovieItem {
  /** 影片 ID */
  id: string;
  /** 影片名称 */
  name: string;
  /** 影片类型列表 */
  types: string[];
  /** 海报 URL */
  posterUrl: string;
  /** 评分（null 表示未评分） */
  rating: number | null;
  /** 时长（分钟） */
  duration: number;
  /** 上映日期 */
  releaseDate: string;
  /** 导演 */
  director: string;
  /** 主演 */
  actors: string;
  /** 影片简介 */
  description: string;
  /** 上下架状态 */
  status: MovieStatus;
}

// ---------- 表单层 ----------

/** 影片表单值 */
export interface MovieFormValues {
  /** 影片名称 */
  name: string;
  /** 影片类型列表 */
  types: string[];
  /** 海报 URL */
  posterUrl: string;
  /** 评分 */
  rating: number | null;
  /** 时长（分钟） */
  duration: number;
  /** 上映日期（dayjs 或字符串） */
  releaseDate: string;
  /** 导演 */
  director: string;
  /** 主演 */
  actors: string;
  /** 影片简介 */
  description: string;
  /** 上下架状态 */
  status: MovieStatus;
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * API status (1=上架 0=下架) → MovieStatus
 */
export function mapMovieStatus(status: number): MovieStatus {
  return status === 1 ? 'showing' : 'offline';
}

/**
 * MovieStatus → API status (1=上架 0=下架)
 */
export function toApiStatus(status: MovieStatus): number {
  return status === 'showing' ? 1 : 0;
}

/**
 * MovieRecord (API) → MovieItem (Store)
 * 转换字段类型，处理可空字段
 */
export function mapMovieRecord(record: MovieRecord): MovieItem {
  return {
    id: record.id,
    name: record.name,
    types: record.types ?? [],
    posterUrl: record.posterUrl ?? '',
    rating: record.rating ?? null,
    duration: record.duration,
    releaseDate: record.releaseDate,
    // 列表接口可能不返回详情字段，用类型断言安全取值
    director: (record as MovieDetail).director ?? '',
    actors: (record as MovieDetail).actors ?? '',
    description: (record as MovieDetail).description ?? '',
    status: mapMovieStatus(record.status),
  };
}
