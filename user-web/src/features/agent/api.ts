import request from '@/shared/request'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionListResponse,
  SessionDetailResponse,
  SendMessageRequest,
  SseCallbacks,
} from './types'

// ---- 普通 REST 接口（走 axios 拦截器） ----

export async function createSession(title?: string): Promise<CreateSessionResponse> {
  const res = await request.post<CreateSessionResponse>('/chat/sessions', {
    title,
  } as CreateSessionRequest)
  return res.data
}

export async function listSessions(
  page: number,
  size: number,
): Promise<SessionListResponse> {
  const res = await request.get<SessionListResponse>('/chat/sessions', {
    params: { page, size },
  })
  return res.data
}

export async function getSessionDetail(id: string): Promise<SessionDetailResponse> {
  const res = await request.get<SessionDetailResponse>(`/chat/sessions/${id}`)
  return res.data
}

export async function deleteSession(id: string): Promise<void> {
  await request.delete(`/chat/sessions/${id}`)
}

// ---- SSE 流式接口（fetch + ReadableStream） ----

export async function sendMessage(
  sessionId: string,
  content: string,
  callbacks: SseCallbacks,
  options?: { scheduleId?: string; seatIds?: string[]; ticketCount?: number },
): Promise<void> {
  const token = useAuthStore.getState().token
  const body: SendMessageRequest = {
    content,
    requestId: crypto.randomUUID(),
    ...options,
  }

  const resp = await fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    if (resp.status === 401) {
      useAuthStore.setState({ token: null, userInfo: null })
      router.navigate('/login')
      return
    }
    callbacks.onError({ code: resp.status, message: `请求失败 (${resp.status})` })
    return
  }

  if (!resp.body) {
    callbacks.onError({ code: 'no_body', message: '响应体为空' })
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 按 SSE 事件块分割（空行分隔）
    let sepIndex: number
    while ((sepIndex = findEventBoundary(buffer)) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex).replace(/^(\r?\n){2,}/, '')
      parseSseEvent(rawEvent, callbacks)
    }
  }

  // 处理 buffer 中残留的最后一条事件
  if (buffer.trim()) {
    parseSseEvent(buffer, callbacks)
  }
}

/**
 * 查找 SSE 事件边界（两个连续换行）。
 * 返回边界在 buffer 中的位置，-1 表示未找到完整事件。
 */
function findEventBoundary(buf: string): number {
  const idx1 = buf.indexOf('\n\n')
  const idx2 = buf.indexOf('\r\n\r\n')
  if (idx1 === -1 && idx2 === -1) return -1
  if (idx1 === -1) return idx2
  if (idx2 === -1) return idx1
  return Math.min(idx1, idx2)
}

/**
 * 解析单个 SSE 事件块。
 * 格式：
 *   event: message
 *   data: {"content":"..."}
 */
function parseSseEvent(raw: string, callbacks: SseCallbacks): void {
  const lines = raw.split(/\r?\n/)
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (dataLines.length === 0) return

  let data: unknown
  try {
    data = JSON.parse(dataLines.join('\n'))
  } catch {
    return
  }

  switch (eventName) {
    case 'message':
      callbacks.onMessage(data as { content: string })
      break
    case 'card':
      callbacks.onCard(data as { cardType: string; cardData: unknown })
      break
    case 'done':
      callbacks.onDone(data as { sessionId: string; intent: string; slots: unknown })
      break
    case 'error':
      callbacks.onError(data as { code: string | number; message: string })
      break
  }
}
