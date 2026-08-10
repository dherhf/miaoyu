/** 影片列表项（简要信息） */
export interface MovieListVO {
  /** 影片ID */
  id: string
  /** 影片名称 */
  name: string
  /** 影片类型标签列表 */
  types: string[]
  /** 海报图片URL */
  posterUrl: string
  /** 评分 */
  rating: number
  /** 片长（分钟） */
  duration: number
  /** 上映日期 */
  releaseDate: string
  /** 影片状态 */
  status: number
}

/** 影片详情（完整信息） */
export interface MovieVO {
  /** 影片ID */
  id: string
  /** 影片名称 */
  name: string
  /** 影片类型标签列表 */
  types: string[]
  /** 海报图片URL */
  posterUrl: string
  /** 评分 */
  rating: number
  /** 片长（分钟） */
  duration: number
  /** 上映日期 */
  releaseDate: string
  /** 导演 */
  director: string
  /** 主演 */
  actors: string
  /** 剧情简介 */
  description: string
  /** 影片状态 */
  status: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 分页查询结果 */
export interface PageResult<T> {
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页条数 */
  size: number
  /** 当前页数据列表 */
  records: T[]
}

/** 影片列表查询参数 */
export interface MovieListParams {
  /** 搜索关键词（影片名称） */
  keyword?: string
  /** 影片类型筛选 */
  type?: string
  /** 页码（从1开始） */
  page?: number
  /** 每页条数 */
  size?: number
  /** 排序方式 */
  sort?: string
}

/** 排片场次列表项 */
export interface ScheduleListVO {
  /** 场次ID */
  id: number
  /** 影片ID */
  movieId: number
  /** 影片名称 */
  movieName: string
  /** 影院ID */
  cinemaId: number
  /** 影院名称 */
  cinemaName: string
  /** 影厅ID */
  hallId: number
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开始时间 */
  startTime: string
  /** 结束时间（散场时间） */
  endTime: string
  /** 票价（元） */
  price: number
  /** 语言版本（如：国语3D、英语原版） */
  languageVersion: string
  /** 总座位数 */
  totalSeats: number
  /** 可选座位数 */
  availableSeats: number
  /** 已售座位数 */
  soldSeats: number
  /** 上座率 */
  occupancyRate: number
  /** 场次状态 */
  status: string
  /** 创建时间 */
  createdAt: string
}

/** 座位信息 */
export interface SeatVO {
  /** 影厅座位格子ID（用于锁座） */
  hallCellId: number
  /** 座位索引（唯一标识） */
  seatIndex: number
  /** 行索引 */
  rowIndex: number
  /** 列索引 */
  colIndex: number
  /** 座位标签（如：A1、B5） */
  seatLabel: string
  /** 座位类别（如：普通座、情侣座） */
  seatCategory: string
  /** 座位状态：available=可选，sold=已售，locked=已锁定 */
  status: string
}

/** 座位图信息 */
export interface SeatMapVO {
  /** 场次ID */
  scheduleId: number
  /** 影厅ID */
  hallId: number
  /** 总行数 */
  totalRows: number
  /** 总列数 */
  totalCols: number
  /** 总座位数 */
  totalSeats: number
  /** 可选座位数 */
  availableSeats: number
  /** 座位列表 */
  seats: SeatVO[]
}

/** 锁座结果（订单信息） */
export interface LockSeatResultVO {
  /** 订单ID */
  id: number
  /** 订单编号 */
  orderNo: string
  /** 场次ID */
  scheduleId: number
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开始时间 */
  startTime: string
  /** 座位信息（文本描述） */
  seatInfo: string
  /** 票数 */
  ticketCount: number
  /** 总金额（元） */
  totalAmount: number
  /** 订单状态 */
  status: string
  /** 创建时间 */
  createdAt: string
  /** 过期时间（订单自动取消） */
  expireAt: string
  /** 剩余支付时间（秒） */
  remainingTime: number
}

/** 支付结果 */
export interface PayResultVO {
  /** 订单ID */
  id: number
  /** 订单编号 */
  orderNo: string
  /** 订单状态 */
  status: string
  /** 取票码 */
  pickupCode: string
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 影院地址 */
  cinemaAddress: string
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开始时间 */
  startTime: string
  /** 座位信息（文本描述） */
  seatInfo: string
  /** 总金额（元） */
  totalAmount: number
}
