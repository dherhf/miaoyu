import { create } from 'zustand'
import type { ChatMessage, CardPayload } from './types'

let msgCounter = 0
function nextMsgId(): string {
  return `msg_${Date.now()}_${++msgCounter}`
}

interface ChatState {
  sessionId: string | null
  sessionTitle: string
  messages: ChatMessage[]
  isStreaming: boolean
  inputValue: string
  abortController: AbortController | null

  setSessionId: (id: string) => void
  setSessionTitle: (title: string) => void
  setInputValue: (v: string) => void
  setIsStreaming: (v: boolean) => void
  setAbortController: (ctrl: AbortController | null) => void

  addUserMessage: (content: string) => void
  /** 创建一条 assistant 占位消息，返回其 msgId 供后续追加 */
  initAssistantMessage: () => string
  appendAssistantContent: (msgId: string, chunk: string) => void
  addCardToAssistant: (msgId: string, card: CardPayload) => void
  finalizeAssistantMessage: (msgId: string, intent?: string, slots?: Record<string, any>) => void

  loadMessages: (msgs: ChatMessage[]) => void
  clearMessages: () => void
  /** 停止生成时标记最后一条 assistant 消息为非 streaming */
  stopStreaming: () => void
}

export const useChatStore = create<ChatState>()((set) => ({
  sessionId: null,
  sessionTitle: '新对话',
  messages: [],
  isStreaming: false,
  inputValue: '',
  abortController: null,

  setSessionId: (id) => set({ sessionId: id }),
  setSessionTitle: (title) => set({ sessionTitle: title }),
  setInputValue: (v) => set({ inputValue: v }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setAbortController: (ctrl) => set({ abortController: ctrl }),

  addUserMessage: (content) => {
    const msg: ChatMessage = {
      msgId: nextMsgId(),
      role: 'user',
      content,
      cards: [],
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ messages: [...s.messages, msg] }))
  },

  initAssistantMessage: () => {
    const msgId = nextMsgId()
    const msg: ChatMessage = {
      msgId,
      role: 'assistant',
      content: '',
      cards: [],
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }
    set((s) => ({ messages: [...s.messages, msg] }))
    return msgId
  },

  appendAssistantContent: (msgId, chunk) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.msgId === msgId ? { ...m, content: m.content + chunk } : m,
      ),
    }))
  },

  addCardToAssistant: (msgId, card) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.msgId === msgId ? { ...m, cards: [...m.cards, card] } : m,
      ),
    }))
  },

  finalizeAssistantMessage: (msgId, intent, slots) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.msgId === msgId
          ? { ...m, isStreaming: false, intent, slots }
          : m,
      ),
    }))
  },

  loadMessages: (msgs) => set({ messages: msgs }),

  clearMessages: () => set({ messages: [], sessionId: null, sessionTitle: '新对话' }),

  stopStreaming: () => {
    set((s) => ({
      isStreaming: false,
      messages: s.messages.map((m) =>
        m.isStreaming
          ? { ...m, isStreaming: false, content: m.content + '(已停止生成)' }
          : m,
      ),
    }))
  },
}))
