import request from '@/shared/request'
import { useAuthStore } from '@/features/auth/store'
import { router } from '@/router'
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  PageResult,
  SessionSummary,
  SessionDetailResponse,
  SendMessageRequest,
  SseCallbacks,
} from './types'

// ---- 普通 REST 接口（走 axios 拦截器） ----

/**
 * 创建新的对话会话。
 * @param title 可选的会话标题（通常为空，标题由后端在首条消息后自动生成）
 * @returns 创建的会话信息（sessionId、标题、状态等）
 * @note 对应后端接口：POST /chat/sessions
 */
export async function createSession(title?: string): Promise<CreateSessionResponse> {
  const res = await request.post<CreateSessionResponse>('/chat/sessions', {
    title,
  } as CreateSessionRequest)
  return res.data
}

/**
 * 分页查询当前的会话（对话）列表。
 * @param page 页码（从 0 开始）
 * @param size 每页条数
 * @returns 会话列表响应（总数 + 记录数组）
 * @note 对应后端接口：GET /chat/sessions
 */
export async function listSessions(
  page: number,
  size: number,
): Promise<PageResult<SessionSummary>> {
  const res = await request.get<PageResult<SessionSummary>>('/chat/sessions', {
    params: { page, size },
  })
  return res.data
}

/**
 * 获取某个会话的详细内容（含历史消息列表）。
 * @param id 会话 ID
 * @returns 会话详情（含 messages 历史消息）
 * @note 对应后端接口：GET /chat/sessions/{id}，使用 _silent 静默模式（加载时不显示全局 loading）
 */
export async function getSessionDetail(id: string): Promise<SessionDetailResponse> {
  const res = await request.get<SessionDetailResponse>(`/chat/sessions/${id}`, {
    _silent: true,
  })
  return res.data
}

/**
 * 删除指定的对话会话。
 * @param id 会话 ID
 * @note 对应后端接口：DELETE /chat/sessions/{id}
 */
export async function deleteSession(id: string): Promise<void> {
  await request.delete(`/chat/sessions/${id}`)
}

// ---- SSE 流式接口（fetch + ReadableStream） ----

/**
 * 向指定会话发送用户消息，并通过 SSE 流式接收 AI 回复。
 * 使用原生 fetch + ReadableStream 读取服务端不断推送的数据块，
 * 每次返回的事件通过 callbacks 回调分发处理（文本增量 / 卡片 / 完成 / 错误）。
 *
 * @param sessionId 目标会话 ID
 * @param content   用户输入的文本内容
 * @param callbacks SSE 事件回调集合（onMessage / onCard / onDone / onError）
 * @param options   可选参数：用户当前定位信息（经度/纬度/城市），用于后端就近查询
 * @note 对应后端接口：POST /api/v1/chat/sessions/{sessionId}/messages（SSE 流式）
 */
export async function sendMessage(
  sessionId: string,
  content: string,
  callbacks: SseCallbacks,
  options?: {
    longitude?: number
    latitude?: number
    city?: string
  },
): Promise<void> {
  // 从全局 auth store 中读取登录令牌；未登录时不携带 Authorization 头
  const token = useAuthStore.getState().token
  // 组装请求体：消息内容 + 请求唯一标识 + 定位信息
  const body: SendMessageRequest = {
    content,
    requestId: crypto.randomUUID(),
    ...options,
  }

  // 发起 POST 请求，开启 SSE 流
  const resp = await fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 若存在令牌则附带 Bearer 认证头
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  // HTTP 状态码非 2xx 时进入错误处理
  if (!resp.ok) {
    // 401 未授权：清除登录状态并跳转登录页
    if (resp.status === 401) {
      useAuthStore.setState({ token: null, userInfo: null })
      router.navigate('/login')
      return
    }
    callbacks.onError({ code: resp.status, message: `请求失败 (${resp.status})` })
    return
  }

  // 响应体为空时直接报错
  if (!resp.body) {
    callbacks.onError({ code: 'no_body', message: '响应体为空' })
    return
  }

  // 获取 ReadableStream reader，逐块读取数据
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // 持续读取流直到结束（done）
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // 将二进制数据解码为文本，追加到 buffer
    buffer += decoder.decode(value, { stream: true })

    // 按 SSE 事件块分割（空行分隔），循环处理已完整的事件
    let sepIndex: number
    while ((sepIndex = findEventBoundary(buffer)) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex) // 提取完整事件块
      // 移除已处理的事件，清理多余空行
      buffer = buffer.slice(sepIndex).replace(/^(\r?\n){2,}/, '')
      parseSseEvent(rawEvent, callbacks)
    }
  }

  // 处理 buffer 中残留的最后一条事件（流结束时可能没有尾随空行）
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
 * Flux<String> 模式下无 event: 行，事件类型内嵌在 JSON payload 的 event 字段中。
 * 格式：
 *   data: {"event":"message","data":{"content":"..."}}
 */
function parseSseEvent(raw: string, callbacks: SseCallbacks): void {
  const lines = raw.split(/\r?\n/)
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (dataLines.length === 0) return

  let payload: { event: string; data: unknown }
  try {
    payload = JSON.parse(dataLines.join('\n'))
  } catch {
    return
  }

  const eventName = payload.event
  const data = payload.data

  switch (eventName) {
    case 'message':
      callbacks.onMessage(data as { content: string })
      break
    case 'card':
      callbacks.onCard(data as { cardType: string; cardData: unknown })
      break
    case 'done':
      callbacks.onDone(data as { sessionId: string; intent: string; slots: unknown; title?: string })
      break
    case 'error':
      callbacks.onError(data as { code: string | number; message: string })
      break
  }
}
