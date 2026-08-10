import request, { type PageResult } from '../../shared/utils/request';
import type { OrderRecord, OrderDetail, OrderListParams } from './types';

export type { OrderRecord, OrderDetail, OrderListParams, OrderSeatRecord } from './types';

/**
 * 订单管理 API
 * 对应后端接口：/api/v1/admin/orders/*
 */
export const orderApi = {
  /**
   * 查询订单列表（分页）
   * GET /api/v1/admin/orders
   * @param params - 查询参数（订单号、影片名、影院名、状态、日期范围、分页）
   * @returns 分页结果
   */
  getOrderList: (params: OrderListParams): Promise<PageResult<OrderRecord>> =>
    request.get('/orders', { params }),

  /**
   * 查询订单详情
   * GET /api/v1/admin/orders/{id}
   * @param id - 订单 ID
   * @returns 订单详情（含座位明细、取消/检票时间等）
   */
  getOrderDetail: (id: string): Promise<OrderDetail> =>
    request.get(`/orders/${id}`),

  /**
   * 检票（通过取票码）
   * POST /api/v1/admin/orders/check-ticket
   * @param pickupCode - 6位取票码
   * @returns 检票成功后的订单详情
   */
  checkTicket: (pickupCode: string): Promise<OrderDetail> =>
    request.post('/orders/check-ticket', { pickupCode }),
};
