// ===================== 订单相关类型 =====================

// ---------- API 层 ----------

/** 订单列表记录 */
export interface OrderRecord {
  id: string;
  orderNo: string;
  userPhone: string;
  movieName: string;
  cinemaName: string;
  hallName: string;
  showDate: string;
  startTime: string;
  seatInfo: string;
  ticketCount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'checked';
  createdAt: string;
  paidAt?: string;
  cancelReason?: string;
}

/** 订单详情 */
export interface OrderDetail extends OrderRecord {
  cancelledAt?: string;
  checkedAt?: string;
  seats?: OrderSeatRecord[];
}

/** 订单详情中的座位记录 */
export interface OrderSeatRecord {
  seatLabel: string;
  status: string;
}

/** 订单列表查询参数 */
export interface OrderListParams {
  orderNo?: string;
  movieName?: string;
  cinemaName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

// ---------- Store 层 ----------

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'checked';

/** 订单座位 */
export interface OrderSeat {
  seatLabel: string;
  status: string;
}

/** 订单条目（Store / 页面展示用） */
export interface OrderItem {
  id: string;
  orderNo: string;
  userPhone: string;
  movieName: string;
  cinemaName: string;
  hallName: string;
  showDate: string;
  startTime: string;
  seatInfo: string;
  ticketCount: number;
  totalAmount: number;
  status: OrderStatus;
  pickupCode?: string;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
  checkedAt?: string;
  cancelReason?: string;
  seats?: OrderSeat[];
}

// ---------- 映射函数 ----------

/** 将 API 返回的 OrderRecord/OrderDetail 映射为 OrderItem */
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
    cancelledAt: (record as OrderDetail).cancelledAt,
    checkedAt: (record as OrderDetail).checkedAt,
    seats: (record as OrderDetail).seats?.map((s) => ({
      seatLabel: s.seatLabel,
      status: s.status,
    })),
  };
}
