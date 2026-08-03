import request, { type PageResult } from '../../shared/utils/request';
import type { OrderRecord, OrderDetail, OrderListParams } from './types';

export type { OrderRecord, OrderDetail, OrderListParams, OrderSeatRecord } from './types';

// ===================== API =====================

/** 查询订单明细列表 */
export function getOrderList(params: OrderListParams): Promise<PageResult<OrderRecord>> {
  return request.get('/orders', { params });
}

/** 查询订单详情 */
export function getOrderDetail(id: number): Promise<OrderDetail> {
  return request.get(`/orders/${id}`);
}
