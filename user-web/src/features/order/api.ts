import request from '@/shared/request'
import type { PageResult } from '@/features/movie/types'
import type { OrderDetailVO, OrderVO, PickupCodeVO } from './types'

/**
 * 获取订单列表（分页）。
 * 后端接口：GET /api/v1/orders
 * @param params 查询参数（状态、页码、每页条数）
 * @returns 分页订单列表
 */
export async function listOrders(
  params: { status?: string; page?: number; size?: number },
): Promise<PageResult<OrderVO>> {
  const res = await request.get<PageResult<OrderVO>>('/orders', { params })
  return res.data
}

/**
 * 获取订单详情。
 * 后端接口：GET /api/v1/orders/{id}
 * @param id 订单ID
 * @returns 订单详细信息
 */
export async function getOrderDetail(id: number): Promise<OrderDetailVO> {
  const res = await request.get<OrderDetailVO>(`/orders/${id}`)
  return res.data
}

/**
 * 支付订单。
 * 后端接口：POST /api/v1/orders/{orderId}/pay
 * 携带 X-Request-Id 请求头用于幂等控制。
 * @param orderId 订单ID
 */
export async function payOrder(orderId: number): Promise<void> {
  await request.post(`/orders/${orderId}/pay`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}

/**
 * 取消订单。
 * 后端接口：PUT /api/v1/orders/{orderId}/cancel
 * 携带 X-Request-Id 请求头用于幂等控制。
 * @param orderId 订单ID
 */
export async function cancelOrder(orderId: number): Promise<void> {
  await request.put(`/orders/${orderId}/cancel`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}

/**
 * 退票（退款）。
 * 后端接口：POST /api/v1/orders/{orderId}/refund
 * 携带 X-Request-Id 请求头用于幂等控制。
 * @param orderId 订单ID
 */
export async function refundOrder(orderId: number): Promise<void> {
  await request.post(`/orders/${orderId}/refund`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}

/**
 * 获取取票码。
 * 后端接口：GET /api/v1/orders/{orderId}/pickup-code
 * 取票码有过期时间，到期后需重新获取。
 * @param orderId 订单ID
 * @returns 取票码和有效期
 */
export async function getPickupCode(orderId: number): Promise<PickupCodeVO> {
  const res = await request.get<PickupCodeVO>(`/orders/${orderId}/pickup-code`)
  return res.data
}
