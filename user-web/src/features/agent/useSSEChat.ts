import { useCallback, useRef } from 'react'
import { useChatStore } from './store'
import type { CardPayload } from './types'

const SSE_TIMEOUT = 60_000       // 60s 无 done 事件则超时
const RETRY_MAX = 3
const RETRY_BASE_MS = 2000
const SLOW_HINT_MS = 3000        // 3s 无事件 → 显示思考中

export function useSSEChat() {
  const rafRef = useRef<number>(0)
  const pendingChunksRef = useRef<string[]>([])
  const pendingCardsRef = useRef<CardPayload[]>([])
  const msgIdRef = useRef<string>('')
  const lastEventTimeRef = useRef<number>(0)

  const store = useChatStore

  /** 刷新节流缓冲：将累积的文本和卡片批量写入 store */
  const flush = useCallback(() => {
    const state = store.getState()
    const mid = msgIdRef.current
    if (!mid) return

    const chunks = pendingChunksRef.current
    if (chunks.length > 0) {
      const text = chunks.join('')
      pendingChunksRef.current = []
      state.appendAssistantContent(mid, text)
    }

    const cards = pendingCardsRef.current
    if (cards.length > 0) {
      pendingCardsRef.current = []
      cards.forEach((c) => state.addCardToAssistant(mid, c))
    }
  }, [store])

  /** 解析 SSE 事件块 */
  const parseSSEBlock = useCallback((block: string): { event: string; data: string } | null => {
    const lines = block.split('\n')
    let event = 'message'
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        data = line.slice(6)
      }
    }
    if (!data) return null
    // 处理多行 data（按规范 data 可能有多行）
    // 此处简化处理，取第一个 data: 行
    return { event, data }
  }, [])

  /** 处理单个 SSE 事件 */
  const handleSSEEvent = useCallback(
    (event: string, data: string) => {
      lastEventTimeRef.current = Date.now()

      switch (event) {
        case 'message': {
          let parsed: { content?: string }
          try { parsed = JSON.parse(data) } catch { return }
          if (parsed.content) {
            pendingChunksRef.current.push(parsed.content)
            scheduleFlush()
          }
          break
        }
        case 'card': {
          let parsed: { cardType?: string; cardData?: unknown }
          try { parsed = JSON.parse(data) } catch { return }
          if (parsed.cardType && parsed.cardData) {
            const card: CardPayload = {
              type: parsed.cardType as CardPayload['type'],
              data: parsed.cardData as any,
            }
            pendingCardsRef.current.push(card)
            scheduleFlush()
          }
          break
        }
        case 'done': {
          flushNow()
          let parsed: { intent?: string; slots?: Record<string, any> }
          try { parsed = JSON.parse(data) } catch { parsed = {} }
          store.getState().finalizeAssistantMessage(
            msgIdRef.current,
            parsed.intent,
            parsed.slots,
          )
          cleanup()
          store.getState().setIsStreaming(false)
          // 首轮对话后更新标题
          if (store.getState().sessionTitle === '新对话') {
            const msgs = store.getState().messages
            const firstUser = msgs.find((m) => m.role === 'user')
            if (firstUser) {
              const title = firstUser.content.slice(0, 20) + (firstUser.content.length > 20 ? '...' : '')
              store.getState().setSessionTitle(title)
            }
          }
          break
        }
        case 'error': {
          flushNow()
          let parsed: { message?: string }
          try { parsed = JSON.parse(data) } catch { parsed = {} }
          store.getState().appendAssistantContent(
            msgIdRef.current,
            parsed.message || '回复出错了，请重试',
          )
          store.getState().finalizeAssistantMessage(msgIdRef.current)
          cleanup()
          store.getState().setIsStreaming(false)
          break
        }
      }
    },
    [store],
  )

  /** 安排节流刷新 */
  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      flush()
    })
  }, [flush])

  /** 立即刷新（跳过节流） */
  const flushNow = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    flush()
  }, [flush])

  /** 清理资源 */
  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    pendingChunksRef.current = []
    pendingCardsRef.current = []
    store.getState().setAbortController(null)
  }, [store])

  /** 发送消息并接收 SSE 流 */
  const sendMessage = useCallback(
    async (content: string, retryCount = 0): Promise<void> => {
      const state = store.getState()
      const sessionId = state.sessionId

      if (!sessionId) {
        // 先创建会话
        const sid = await createSession()
        if (!sid) {
          state.appendAssistantContent(msgIdRef.current, '创建会话失败，请重试')
          state.finalizeAssistantMessage(msgIdRef.current)
          state.setIsStreaming(false)
          state.setAbortController(null)
          return
        }
        state.setSessionId(sid)
      }

      const currentSessionId = store.getState().sessionId!
      const abortController = new AbortController()
      store.getState().setAbortController(abortController)
      lastEventTimeRef.current = Date.now()

      // 弱网提示定时器
      let slowHintTimer: ReturnType<typeof setTimeout> | null = null
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null

      const clearTimers = () => {
        if (slowHintTimer) { clearTimeout(slowHintTimer); slowHintTimer = null }
        if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
      }

      try {
        const token = localStorage.getItem('auth-storage')
          ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token
          : null

        const response = await fetch(
          `/api/v1/chat/sessions/${currentSessionId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content }),
            signal: abortController.signal,
          },
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errMsg = (errorData as any).message || `请求失败 (${response.status})`
          store.getState().appendAssistantContent(msgIdRef.current, errMsg)
          store.getState().finalizeAssistantMessage(msgIdRef.current)
          store.getState().setIsStreaming(false)
          store.getState().setAbortController(null)
          return
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // 启动超时定时器
        timeoutTimer = setTimeout(() => {
          abortController.abort()
        }, SSE_TIMEOUT)

        // 启动弱网提示定时器
        slowHintTimer = setTimeout(() => {
          const now = Date.now()
          if (now - lastEventTimeRef.current >= SLOW_HINT_MS) {
            store.getState().appendAssistantContent(
              msgIdRef.current,
              '\n\n_正在努力思考中..._',
            )
          }
        }, SLOW_HINT_MS)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 按 \n\n 分割事件块
          const parts = buffer.split('\n\n')
          // 最后一部分可能不完整，保留到下次
          buffer = parts.pop() || ''

          for (const part of parts) {
            if (!part.trim()) continue
            const parsed = parseSSEBlock(part)
            if (parsed) {
              handleSSEEvent(parsed.event, parsed.data)
            }
          }
        }

        // 处理剩余 buffer
        if (buffer.trim()) {
          const parsed = parseSSEBlock(buffer)
          if (parsed) {
            handleSSEEvent(parsed.event, parsed.data)
          }
        }

        // 流结束但没有收到 done 事件
        const state = store.getState()
        const currentMsg = state.messages.find((m) => m.msgId === msgIdRef.current)
        if (currentMsg?.isStreaming) {
          flushNow()
          state.finalizeAssistantMessage(msgIdRef.current)
          state.setIsStreaming(false)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // 用户主动停止
          flushNow()
          store.getState().stopStreaming()
          store.getState().setIsStreaming(false)
        } else {
          // 网络错误，重试
          if (retryCount < RETRY_MAX) {
            const delay = RETRY_BASE_MS * Math.pow(2, retryCount)
            await new Promise((r) => setTimeout(r, delay))
            await sendMessage(content, retryCount + 1)
          } else {
            store.getState().appendAssistantContent(
              msgIdRef.current,
              '\n\n发送失败，请点击重试',
            )
            store.getState().finalizeAssistantMessage(msgIdRef.current)
            store.getState().setIsStreaming(false)
            store.getState().setAbortController(null)
          }
        }
      } finally {
        clearTimers()
        cleanup()
      }
    },
    [store, parseSSEBlock, handleSSEEvent, scheduleFlush, flushNow, cleanup],
  )

  /** 用户发送消息入口 */
  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const state = store.getState()
      if (state.isStreaming) return

      // 1. 追加用户消息
      state.addUserMessage(trimmed)
      state.setInputValue('')
      state.setIsStreaming(true)

      // 2. 创建 assistant 占位消息
      msgIdRef.current = state.initAssistantMessage()

      // 3. 发起 SSE
      await sendMessage(trimmed)
    },
    [store, sendMessage],
  )

  /** 用户点击停止生成 */
  const stopGeneration = useCallback(() => {
    const state = store.getState()
    state.abortController?.abort()
  }, [store])

  return {
    send,
    stopGeneration,
    isStreaming: useChatStore((s) => s.isStreaming),
  }
}

/** 创建新会话，返回 sessionId */
async function createSession(): Promise<string | null> {
  try {
    const raw = localStorage.getItem('auth-storage')
    const token = raw ? JSON.parse(raw).state?.token : null

    const res = await fetch('/api/v1/chat/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    // 响应格式: { code: 0, data: { sessionId: "xxx" } }
    const data = json.data || json
    return data.sessionId || null
  } catch {
    return null
  }
}

/** 获取会话详情（恢复历史消息） */
export async function fetchSessionDetail(sessionId: string): Promise<{
  messages: import('./types').ChatMessage[]
  slotState?: Record<string, any>
} | null> {
  try {
    const raw = localStorage.getItem('auth-storage')
    const token = raw ? JSON.parse(raw).state?.token : null

    const res = await fetch(`/api/v1/chat/sessions/${sessionId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    const data = json.data || json
    return {
      messages: (data.messages || []).map((m: any) => ({
        msgId: m.msgId || `msg_${Date.now()}_${Math.random()}`,
        role: m.role,
        content: m.content || '',
        cards: (m.cards || []).map((c: any) => ({
          type: c.cardType || c.type,
          data: c.cardData || c.data,
        })),
        intent: m.intent,
        slots: m.slots,
        createdAt: m.createdAt || new Date().toISOString(),
        isStreaming: false,
      })),
      slotState: data.slotState,
    }
  } catch {
    return null
  }
}
