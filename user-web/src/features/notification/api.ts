import request from '@/shared/request'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'
import type { NotificationVO, PageResult } from './types'

// 获取通知
export async function getNotifications(
  page = 1,
  size = 20,
): Promise<PageResult<NotificationVO>> {
  const res = await request.get<PageResult<NotificationVO>>('/notifications', {
    params: { page, size },
  })
  return res.data
}

// 已读通知
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
  if (!token) return () => {}

  let aborted = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined

  const scheduleReconnect = () => {
    reconnectTimer = setTimeout(connect, 3000)
  }

  async function connect() {
    if (aborted) return
    controller = new AbortController()

    try {
      const resp = await fetch('/api/v1/notifications/stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      if (resp.status === 401) {
        useAuthStore.setState({ token: null, userInfo: null })
        router.navigate('/login')
        return
      }

      if (!resp.ok || !resp.body) {
        if (!aborted) scheduleReconnect()
        return
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done || aborted) break
        buffer += decoder.decode(value, { stream: true })

        let sepIndex: number
        while ((sepIndex = findSseBoundary(buffer)) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex).replace(/^(\r?\n){2,}/, '')
          parseSseEvent(rawEvent, onNotification)
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
    }

    if (!aborted) scheduleReconnect()
  }

  connect()

  return () => {
    aborted = true
    controller?.abort()
    if (reconnectTimer) clearTimeout(reconnectTimer)
  }
}

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

  if (eventName === 'notification' && dataStr) {
    try {
      onNotification(JSON.parse(dataStr) as NotificationVO)
    } catch {
      // JSON 解析失败，忽略
    }
  }
}
