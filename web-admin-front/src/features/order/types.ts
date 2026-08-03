// ===================== 订单相关类型 =====================

// ---------- API 层 ----------

/** 订单列表记录 */
export interface OrderRecord {
  id: number;
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
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  createdAt: string;
  paidAt?: string;
  cancelReason?: string;
}

/** 订单详情 */
export interface OrderDetail extends OrderRecord {
  cinemaAddress?: string;
  pickupCode?: string;
  cancelledAt?: string;
  seats?: OrderSeatRecord[];
}

/** 订单详情中的座位记录 */
export interface OrderSeatRecord {
  seatLabel: string;
  status: 'sold' | 'available';
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
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

/** 订单座位 */
export interface OrderSeat {
  seatLabel: string;
  status: 'sold' | 'available';
}

/** 订单条目（Store / 页面展示用） */
export interface OrderItem {
  id: number;
  orderNo: string;
  userPhone: string;
  userId?: number;
  movieName: string;
  cinemaName: string;
  cinemaAddress?: string;
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
  cancelReason?: string;
  seats?: OrderSeat[];
  scheduleId?: number;
}
