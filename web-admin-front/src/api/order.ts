import request, { type PageResult } from '../utils/request';
import type { OrderRecord, OrderDetail, OrderListParams } from '../types/order';

export type { OrderRecord, OrderDetail, OrderListParams, OrderSeatRecord } from '../types/order';

// ===================== API =====================

/** 查询订单明细列表 */
export function getOrderList(params: OrderListParams): Promise<PageResult<OrderRecord>> {
  return request.get('/orders', { params });
}

/** 查询订单详情 */
export function getOrderDetail(id: number): Promise<OrderDetail> {
  return request.get(`/orders/${id}`);
}
