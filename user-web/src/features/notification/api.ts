import request from '@/shared/request'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'
import type { NotificationVO, PageResult } from './types'

/**
 * 获取通知列表（分页）。
 * 后端接口：GET /api/v1/notifications?page={page}&size={size}
 * @param page 页码，默认 1
 * @param size 每页条数，默认 20
 * @returns 分页通知列表
 */
export async function getNotifications(
  page = 1,
  size = 20,
): Promise<PageResult<NotificationVO>> {
  const res = await request.get<PageResult<NotificationVO>>('/notifications', {
    params: { page, size },
  })
  return res.data
}

/**
 * 标记通知为已读。
 * 后端接口：PUT /api/v1/notifications/{id}/read
 * @param id 通知ID
 */
export async function markNotificationRead(id: number): Promise<void> {
  await request.put(`/notifications/${id}/read`)
}

/**
 * 订阅通知 SSE 推送。
 *
 * 使用 fetch + ReadableStream（与 chat SSE 一致，携带 Authorization 头）。
 * 连接断开后 3 秒自动重连；401 时清除登录态并跳转登录页。
 *
 * @param onNotification 收到通知时的回调
 * @returns cleanup 函数（中止 fetch、阻止重连）
 */
export function subscribeNotifications(
  onNotification: (n: NotificationVO) => void,
): () => void {
  const token = useAuthStore.getState().token
  // 未登录则不订阅
  if (!token) return () => {}

  let aborted = false  // 是否已中止（阻止重连）
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined

  /** 3 秒后自动重连 */
  const scheduleReconnect = () => {
    reconnectTimer = setTimeout(connect, 3000)
  }

  /** 建立 SSE 连接并读取流数据 */
  async function connect() {
    if (aborted) return
    controller = new AbortController()

    try {
      const resp = await fetch('/api/v1/notifications/stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      // 401 未授权：清除登录态并跳转登录页
      if (resp.status === 401) {
        useAuthStore.setState({ token: null, userInfo: null })
        router.navigate('/login')
        return
      }

      // 非 200 响应：3 秒后重连
      if (!resp.ok || !resp.body) {
        if (!aborted) scheduleReconnect()
        return
      }

      // 读取流数据，按 SSE 事件边界分割
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done || aborted) break
        buffer += decoder.decode(value, { stream: true })

        // 解析完整的 SSE 事件块
        let sepIndex: number
        while ((sepIndex = findSseBoundary(buffer)) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex).replace(/^(\r?\n){2,}/, '')
          parseSseEvent(rawEvent, onNotification)
        }
      }
    } catch (e) {
      // AbortError 是主动中止，不重连
      if (e instanceof Error && e.name === 'AbortError') return
    }

    // 连接断开后自动重连
    if (!aborted) scheduleReconnect()
  }

  connect()

  // 返回清理函数：中止 fetch 并阻止重连
  return () => {
    aborted = true
    controller?.abort()
    if (reconnectTimer) clearTimeout(reconnectTimer)
  }
}

/**
 * 在缓冲区中查找 SSE 事件块边界（双换行符）。
 * @param buf 文本缓冲区
 * @returns 边界索引，未找到返回 -1
 */
function findSseBoundary(buf: string): number {
  const idx1 = buf.indexOf('\n\n')
  const idx2 = buf.indexOf('\r\n\r\n')
  if (idx1 === -1 && idx2 === -1) return -1
  if (idx1 === -1) return idx2
  if (idx2 === -1) return idx1
  return Math.min(idx1, idx2)
}

/**
 * 解析标准 SSE 事件块（event:xxx\ndata:{...}）。
 * 忽略注释行（:heartbeat）。
 * @param raw 原始事件块文本
 * @param onNotification 收到通知时的回调
 */
function parseSseEvent(
  raw: string,
  onNotification: (n: NotificationVO) => void,
): void {
  const lines = raw.split(/\r?\n/)
  let eventName = ''
  let dataStr = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataStr += line.slice(5).trim()
    }
  }

  // 仅处理 notification 类型的事件
  if (eventName === 'notification' && dataStr) {
    try {
      onNotification(JSON.parse(dataStr) as NotificationVO)
    } catch {
      // JSON 解析失败，忽略
    }
  }
}
