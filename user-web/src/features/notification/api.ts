import request from '@/shared/request'
import type { NotificationVO, PageResult } from './types'

export async function getNotifications(
  page = 1,
  size = 20,
): Promise<PageResult<NotificationVO>> {
  const res = await request.get<PageResult<NotificationVO>>('/notifications', {
    params: { page, size },
  })
  return res.data
}

export async function markNotificationRead(id: number): Promise<void> {
  await request.put(`/notifications/${id}/read`)
}
