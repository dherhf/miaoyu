// ===================== 订单相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 订单列表记录（API 返回） */
export interface OrderRecord {
  /** 订单 ID */
  id: string;
  /** 订单编号（展示用） */
  orderNo: string;
  /** 用户手机号 */
  userPhone: string;
  /** 影片名称 */
  movieName: string;
  /** 影院名称 */
  cinemaName: string;
  /** 影厅名称 */
  hallName: string;
  /** 放映日期 */
  showDate: string;
  /** 放映开始时间 */
  startTime: string;
  /** 座位信息（拼接文本） */
  seatInfo: string;
  /** 票数 */
  ticketCount: number;
  /** 订单总金额 */
  totalAmount: number;
  /** 订单状态：pending=待支付 / paid=已出票 / cancelled=已取消 / refunded=已退票 / checked=已检票 / expired=已过期 */
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'checked' | 'expired';
  /** 创建时间 */
  createdAt: string;
  /** 支付时间 */
  paidAt?: string;
  /** 取消原因 */
  cancelReason?: string;
}

/** 订单详情（含额外字段） */
export interface OrderDetail extends OrderRecord {
  /** 取消时间 */
  cancelledAt?: string;
  /** 检票时间 */
  checkedAt?: string;
  /** 座位明细列表 */
  seats?: OrderSeatRecord[];
}

/** 订单详情中的座位记录 */
export interface OrderSeatRecord {
  /** 座位标签（如 A1, B2） */
  seatLabel: string;
  /** 座位状态 */
  status: string;
}

/** 订单列表查询参数 */
export interface OrderListParams {
  /** 订单编号 */
  orderNo?: string;
  /** 影片名称 */
  movieName?: string;
  /** 影院名称 */
  cinemaName?: string;
  /** 订单状态 */
  status?: string;
  /** 日期范围-开始 */
  dateFrom?: string;
  /** 日期范围-结束 */
  dateTo?: string;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  size?: number;
}

// ---------- Store 层（前端展示用类型）----------

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'checked' | 'expired';

/** 订单座位（前端展示用） */
export interface OrderSeat {
  /** 座位标签 */
  seatLabel: string;
  /** 座位状态 */
  status: string;
}

/** 订单条目（Store / 页面展示用） */
export interface OrderItem {
  /** 订单 ID */
  id: string;
  /** 订单编号 */
  orderNo: string;
  /** 用户手机号 */
  userPhone: string;
  /** 影片名称 */
  movieName: string;
  /** 影院名称 */
  cinemaName: string;
  /** 影厅名称 */
  hallName: string;
  /** 放映日期 */
  showDate: string;
  /** 放映开始时间 */
  startTime: string;
  /** 座位信息（拼接文本） */
  seatInfo: string;
  /** 票数 */
  ticketCount: number;
  /** 订单总金额 */
  totalAmount: number;
  /** 订单状态 */
  status: OrderStatus;
  /** 取票码 */
  pickupCode?: string;
  /** 创建时间 */
  createdAt: string;
  /** 支付时间 */
  paidAt?: string;
  /** 取消时间 */
  cancelledAt?: string;
  /** 检票时间 */
  checkedAt?: string;
  /** 取消原因 */
  cancelReason?: string;
  /** 座位明细列表 */
  seats?: OrderSeat[];
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * 将 API 返回的 OrderRecord/OrderDetail 映射为 OrderItem
 * 处理详情中才有的额外字段（cancelledAt/checkedAt/seats）
 */
export function mapOrderRecord(record: OrderRecord): OrderItem {
  return {
    id: record.id,
    orderNo: record.orderNo,
    userPhone: record.userPhone,
    movieName: record.movieName,
    cinemaName: record.cinemaName,
    hallName: record.hallName,
    showDate: record.showDate,
    startTime: record.startTime,
    seatInfo: record.seatInfo,
    ticketCount: record.ticketCount,
    totalAmount: record.totalAmount,
    status: record.status,
    createdAt: record.createdAt,
    paidAt: record.paidAt,
    cancelReason: record.cancelReason,
    // 详情字段：通过类型断言安全取值
    cancelledAt: (record as OrderDetail).cancelledAt,
    checkedAt: (record as OrderDetail).checkedAt,
    seats: (record as OrderDetail).seats?.map((s) => ({
      seatLabel: s.seatLabel,
      status: s.status,
    })),
  };
}
