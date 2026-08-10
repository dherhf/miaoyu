// ===================== 排期相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 排期列表记录（API 返回） */
export interface ScheduleRecord {
  /** 场次 ID */
  id: string;
  /** 影片 ID */
  movieId: string;
  /** 影片名称 */
  movieName: string;
  /** 影院 ID */
  cinemaId: string;
  /** 影院名称 */
  cinemaName: string;
  /** 影厅 ID */
  hallId: string;
  /** 影厅名称 */
  hallName: string;
  /** 放映日期（YYYY-MM-DD） */
  showDate: string;
  /** 开始时间（HH:mm） */
  startTime: string;
  /** 结束时间（HH:mm） */
  endTime: string;
  /** 票价（元） */
  price: number;
  /** 语言版本 */
  languageVersion: string;
  /** 总座位数 */
  totalSeats: number;
  /** 可用座位数 */
  availableSeats: number;
  /** 已售座位数 */
  soldSeats: number;
  /** 上座率 */
  occupancyRate: number;
  /** 状态：onsale=在售 / cancelled=已取消 / ended=已结束 */
  status: 'onsale' | 'cancelled' | 'ended';
  /** 创建时间 */
  createdAt: string;
}

/** 排期详情（含额外信息） */
export interface ScheduleDetail extends ScheduleRecord {
  /** 影片海报 URL */
  moviePosterUrl?: string;
  /** 影片时长（分钟） */
  movieDuration?: number;
  /** 影院地址 */
  cinemaAddress?: string;
  /** 影厅放映类型 */
  hallScreenType?: string;
  /** 锁定座位数（支付中） */
  lockedSeats?: number;
  /** 更新时间 */
  updatedAt?: string;
}

/** 排期列表查询参数 */
export interface ScheduleListParams {
  /** 影院 ID */
  cinemaId?: string;
  /** 影片 ID */
  movieId?: string;
  /** 影厅 ID */
  hallId?: string;
  /** 放映日期 */
  showDate?: string;
  /** 状态 */
  status?: string;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  size?: number;
}

/** 新增排期参数 */
export interface ScheduleCreateParams {
  /** 影片 ID */
  movieId: string;
  /** 影院 ID */
  cinemaId: string;
  /** 影厅 ID */
  hallId: string;
  /** 放映日期 */
  showDate: string;
  /** 开始时间 */
  startTime: string;
  /** 票价 */
  price: number;
  /** 语言版本 */
  languageVersion: string;
}

/** 修改排期参数 */
export interface ScheduleUpdateParams {
  /** 影厅 ID */
  hallId?: string;
  /** 放映日期 */
  showDate?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 票价 */
  price?: number;
  /** 语言版本 */
  languageVersion?: string;
}

// ---------- Store 层（前端展示用类型）----------

/** 排期状态（前端展示用，增加了 full=满场） */
export type ScheduleStatus = 'available' | 'full' | 'ended' | 'cancelled';

/** 排期条目（Store / 页面展示用） */
export interface ScheduleItem {
  /** 场次 ID */
  id: string;
  /** 影院 ID */
  cinemaId: string;
  /** 影院名称 */
  cinemaName: string;
  /** 影厅 ID */
  hallId: string;
  /** 影厅名称 */
  hallName: string;
  /** 影片 ID */
  movieId: string;
  /** 影片名称 */
  movieName: string;
  /** 放映日期 */
  showDate: string;
  /** 开始时间 */
  showTime: string;
  /** 结束时间 */
  endTime: string;
  /** 票价 */
  price: number;
  /** 语言版本 */
  languageVersion: string;
  /** 总座位数 */
  totalSeats: number;
  /** 已售座位数 */
  soldSeats: number;
  /** 可用座位数 */
  availableSeats: number;
  /** 场次状态 */
  status: ScheduleStatus;
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * API status ('onsale' | 'cancelled' | 'ended') → ScheduleStatus
 * 后端 onsale 根据可用座位数细分为 available / full
 */
export function mapScheduleStatus(status: string, availableSeats: number): ScheduleStatus {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'ended') return 'ended';
  // 在售状态根据可用座位数细分：0=满场，>0=可售
  return availableSeats === 0 ? 'full' : 'available';
}

/**
 * ScheduleRecord (API) → ScheduleItem (Store)
 * 转换字段类型，重命名 startTime → showTime，映射状态
 */
export function mapScheduleRecord(record: ScheduleRecord): ScheduleItem {
  return {
    id: record.id,
    cinemaId: record.cinemaId,
    cinemaName: record.cinemaName,
    hallId: record.hallId,
    hallName: record.hallName,
    movieId: record.movieId,
    movieName: record.movieName,
    showDate: record.showDate,
    showTime: record.startTime,  // API 字段名 startTime → 前端 showTime
    endTime: record.endTime,
    price: record.price,
    languageVersion: record.languageVersion,
    totalSeats: record.totalSeats,
    soldSeats: record.soldSeats,
    availableSeats: record.availableSeats,
    status: mapScheduleStatus(record.status, record.availableSeats),
  };
}
