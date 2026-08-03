// ===================== 影院相关类型 =====================

// ---------- API 层 ----------

/** 影院列表记录 */
export interface CinemaRecord {
  id: number;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities?: string[];
  rating?: number;
  phone?: string;
  status: number; // 1=营业中 0=停业
  hallCount: number;
  createdAt: string;
}

/** 影院详情 */
export interface CinemaDetail extends CinemaRecord {
  updatedAt: string;
}

/** 影院列表查询参数 */
export interface CinemaListParams {
  keyword?: string;
  status?: number;
  page?: number;
  size?: number;
}

/** 新增/编辑影院参数 */
export interface CinemaCreateParams {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities?: string[];
  rating?: number;
  phone?: string;
}

// ---------- Store 层 ----------

/** 影院营业状态 */
export type CinemaStatus = 'active' | 'closed';

/** 影院条目（Store / 页面展示用） */
export interface CinemaItem {
  id: number;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities: string[];
  rating: number | null;
  phone: string | null;
  status: CinemaStatus;
  branch?: string;
  hallCount?: number;
}
