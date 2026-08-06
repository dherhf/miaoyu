import request from '@/shared/request'
import type { PageResult } from '@/features/movie/types'
import type { OrderDetailVO, OrderVO } from './types'

export async function listOrders(
  params: { status?: string; page?: number; size?: number },
): Promise<PageResult<OrderVO>> {
  const res = await request.get<PageResult<OrderVO>>('/orders', { params })
  return res.data
}

export async function getOrderDetail(id: number): Promise<OrderDetailVO> {
  const res = await request.get<OrderDetailVO>(`/orders/${id}`)
  return res.data
}

export async function payOrder(orderId: number): Promise<void> {
  await request.post(`/orders/${orderId}/pay`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}

export async function cancelOrder(orderId: number): Promise<void> {
  await request.put(`/orders/${orderId}/cancel`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}

export async function refundOrder(orderId: number): Promise<void> {
  await request.post(`/orders/${orderId}/refund`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
}
