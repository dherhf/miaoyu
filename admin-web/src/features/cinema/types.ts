// ===================== 影院相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 影院列表记录（API 返回） */
export interface CinemaRecord {
  /** 影院 ID */
  id: string;
  /** 影院名称 */
  name: string;
  /** 详细地址 */
  address: string;
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
  /** 设施标签列表（如 IMAX、杜比等） */
  facilities?: string[];
  /** 评分（0-10） */
  rating?: number;
  /** 联系电话 */
  phone?: string;
  /** 状态：1=营业中 0=停业 */
  status: number;
  /** 影厅数量 */
  hallCount: number;
  /** 创建时间 */
  createdAt: string;
}

/** 影院详情（含更新时间） */
export interface CinemaDetail extends CinemaRecord {
  /** 更新时间 */
  updatedAt: string;
}

/** 影院列表查询参数 */
export interface CinemaListParams {
  /** 搜索关键词（影院名称） */
  keyword?: string;
  /** 状态筛选：1=营业中 0=停业 */
  status?: number;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  size?: number;
}

/** 新增/编辑影院参数 */
export interface CinemaCreateParams {
  /** 影院名称 */
  name: string;
  /** 详细地址 */
  address: string;
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
  /** 设施标签列表 */
  facilities?: string[];
  /** 评分 */
  rating?: number;
  /** 联系电话 */
  phone?: string;
}

// ---------- Store 层（前端展示用类型）----------

/** 影院营业状态 */
export type CinemaStatus = 'active' | 'closed';

/** 影院条目（Store / 页面展示用） */
export interface CinemaItem {
  /** 影院 ID */
  id: string;
  /** 影院名称 */
  name: string;
  /** 详细地址 */
  address: string;
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
  /** 设施标签列表 */
  facilities: string[];
  /** 评分（null 表示未评分） */
  rating: number | null;
  /** 联系电话（null 表示未填写） */
  phone: string | null;
  /** 营业状态 */
  status: CinemaStatus;
  /** 分店名称（预留字段） */
  branch?: string;
  /** 影厅数量 */
  hallCount?: number;
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * API status (1=营业 0=停业) → CinemaStatus
 */
export function mapCinemaStatus(status: number): CinemaStatus {
  return status === 1 ? 'active' : 'closed';
}

/**
 * CinemaStatus → API status (1=营业 0=停业)
 */
export function toApiStatus(status: CinemaStatus): number {
  return status === 'active' ? 1 : 0;
}

/**
 * CinemaRecord (API) → CinemaItem (Store)
 * 转换字段类型：status 数字→字符串，rating/phone 可空处理
 */
export function mapCinemaRecord(record: CinemaRecord): CinemaItem {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    longitude: record.longitude,
    latitude: record.latitude,
    facilities: record.facilities ?? [],
    rating: record.rating ?? null,
    phone: record.phone ?? null,
    status: mapCinemaStatus(record.status),
    hallCount: record.hallCount,
  };
}
