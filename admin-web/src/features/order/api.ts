import request, { type PageResult } from '@/shared/utils/request';
import type { OrderRecord, OrderDetail, OrderListParams } from './types';

export type { OrderRecord, OrderDetail, OrderListParams, OrderSeatRecord } from './types';

export const orderApi = {
  /** 查询订单明细列表 */
  getOrderList: (params: OrderListParams): Promise<PageResult<OrderRecord>> =>
    request.get('/orders', { params }),

  /** 查询订单详情 */
  getOrderDetail: (id: string): Promise<OrderDetail> =>
    request.get(`/orders/${id}`),

  /** 检票 */
  checkTicket: (pickupCode: string): Promise<OrderDetail> =>
    request.post('/orders/check-ticket', { pickupCode }),
};
