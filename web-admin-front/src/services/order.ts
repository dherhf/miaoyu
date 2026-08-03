import request, { type PageResult } from '../utils/request';

// ===================== 类型 =====================
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

export interface OrderDetail extends OrderRecord {
  cinemaAddress?: string;
  pickupCode?: string;
  cancelledAt?: string;
  seats?: Array<{
    seatLabel: string;
    status: 'sold' | 'available';
  }>;
}

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

// ===================== API =====================

/** 查询订单明细列表 */
export function getOrderList(params: OrderListParams): Promise<PageResult<OrderRecord>> {
  return request.get('/orders', { params });
}

/** 查询订单详情 */
export function getOrderDetail(id: number): Promise<OrderDetail> {
  return request.get(`/orders/${id}`);
}
