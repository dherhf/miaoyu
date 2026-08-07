import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Popconfirm } from 'antd'
import { DeleteOutlined, MessageOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Streamdown } from 'streamdown'
import { createSession, deleteSession, getSessionDetail, listSessions, sendMessage } from './api'
import CardRenderer from './components/CardRenderer'
import type { ChatMessage, SessionSummary, SseCallbacks } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(id)
  const [loading, setLoading] = useState(Boolean(id))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const locallyCreatedRef = useRef<string | null>(null)

  useHeaderBack(true, '/')

  useEffect(() => {
    setActiveId(id)
  }, [id])

  useEffect(() => {
    listSessions(0, 50)
      .then((res) => setSessions(res.records))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      setLoading(false)
      return
    }
    if (locallyCreatedRef.current === activeId) {
      locallyCreatedRef.current = null
      return
    }
    setLoading(true)
    getSessionDetail(activeId)
      .then((detail) => {
        setMessages(
          detail.messages.map((m) => ({
            msgId: m.msgId,
            role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
            cards: m.cardType
              ? [{ cardType: m.cardType, cardData: m.cardData }]
              : [],
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }, [])

  /** 构造 SSE 回调（handleSend 和 handleCardAction 共用） */
  const createSseCallbacks = useCallback((): SseCallbacks => {
    return {
      onMessage: (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = {
              ...next[lastIndex],
              content: next[lastIndex].content + event.content,
            }
          }
          return next
        })
      },
      onCard: (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = {
              ...next[lastIndex],
              cards: [...next[lastIndex].cards, { cardType: event.cardType, cardData: event.cardData }],
              pending: false,
            }
          }
          return next
        })
      },
      onDone: () => {
        setMessages((prev) => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = { ...next[lastIndex], pending: false }
          }
          return next
        })
      },
      onError: (event) => {
        message.error(event.message || '对话异常')
        setMessages((prev) => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = {
              ...next[lastIndex],
              content: next[lastIndex].content || '抱歉，回复出现了问题，请重试。',
              pending: false,
            }
          }
          return next
        })
      },
    }
  }, [message])

  /** 确保存在会话：新对话在发出第一条消息时才创建，返回 sessionId */
  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeId) return activeId
    const session = await createSession()
    locallyCreatedRef.current = session.sessionId
    setActiveId(session.sessionId)
    navigate(`/chat/${session.sessionId}`, { replace: true })
    const summary: SessionSummary = {
      sessionId: session.sessionId,
      title: session.title,
      status: session.status,
      lastMessageAt: session.createdAt,
      createdAt: session.createdAt,
    }
    setSessions((prev) => [summary, ...prev])
    return session.sessionId
  }, [activeId, navigate])

  /** 发送消息到后端 SSE */
  const sendToBackend = useCallback(async (content: string) => {
    let sid = activeId
    if (!sid) {
      try {
        sid = await ensureSession()
      } catch {
        return
      }
    }
    const userMsg: ChatMessage = { role: 'user', content, cards: [] }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', cards: [], pending: true }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    setSending(true)
    await sendMessage(sid, content, createSseCallbacks())
    setSending(false)
  }, [activeId, createSseCallbacks, ensureSession])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendToBackend(content)
  }

  const handleNewChat = () => {
    navigate('/chat')
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      message.success('已删除')
      if (activeId === sessionId) {
        navigate('/chat', { replace: true })
      }
    } catch {
      // 拦截器已统一提示
    }
  }

  /** 卡片交互回调：将用户操作意图作为新消息发送 */
  const handleCardAction = useCallback(async (text: string) => {
    if (sending) return
    await sendToBackend(text)
  }, [sending, sendToBackend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface">
        <div className="p-2 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full h-9 rounded-lg border border-dashed border-accent-line bg-accent-soft text-accent text-sm font-medium cursor-pointer flex items-center justify-center gap-1 transition-colors duration-150"
          >
            <PlusOutlined />
            新对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              onClick={() => s.sessionId !== activeId && navigate(`/chat/${s.sessionId}`)}
              className={`group flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors duration-150 ${
                s.sessionId === activeId
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-heading hover:bg-surface-alt'
              }`}
            >
              <span className="flex-1 min-w-0 truncate">{s.title || '新对话'}</span>
              <Popconfirm
                title="确定删除此对话?"
                okText="删除"
                cancelText="取消"
                onConfirm={() => handleDeleteSession(s.sessionId)}
              >
                <DeleteOutlined
                  className="text-muted text-xs opacity-0 group-hover:opacity-100 cursor-pointer p-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {loading ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
              <SkeletonRow align="left" />
              <SkeletonRow align="right" />
              <SkeletonRow align="left" w={220} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
              {messages.length === 0 && <EmptyChat />}

              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} onCardAction={handleCardAction} />
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <div className="flex gap-2 items-end pt-2 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-border bg-surface flex-shrink-0">
          <textarea
            ref={textareaRef}
            className="flex-1 min-h-[36px] py-2 px-3.5 rounded-[18px] border border-border bg-surface text-heading text-[15px] resize-none outline-none leading-[1.4] transition-[border-color,box-shadow] duration-200 focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={`w-9 h-9 rounded-full border-none flex items-center justify-center shrink-0 text-lg transition-[background,transform] duration-200 ${input.trim() && !sending ? 'bg-accent text-white cursor-pointer shadow-[0_2px_8px_var(--color-accent-soft)]' : 'bg-code-bg text-muted cursor-not-allowed'}`}
          >
            <SendOutlined />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onCardAction,
}: {
  message: ChatMessage
  onCardAction: (text: string) => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="chat-bubble-enter flex justify-end">
        <div className="max-w-[78%] py-[9px] px-[14px] rounded-[16px_16px_4px_16px] bg-accent text-white text-[15px] leading-[1.5] break-words shadow-[0_1px_3px_rgba(170,59,255,0.2)]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="chat-bubble-enter flex justify-start">
      <div className="max-w-[85%] flex flex-col gap-1">
        {message.pending && !message.content && message.cards.length === 0 ? (
          <TypingIndicator />
        ) : (
          <>
            {message.content && (
              <div className="py-[9px] px-[14px] rounded-[4px_16px_16px_16px] bg-surface-alt text-heading text-[15px] leading-[1.5] break-words">
                <Streamdown isAnimating={message.pending}>
                  {message.content}
                </Streamdown>
              </div>
            )}
            {message.cards.map((card, i) => (
              <CardRenderer
                key={i}
                cardType={card.cardType}
                cardData={card.cardData}
                onAction={onCardAction}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="inline-flex gap-[5px] py-3 px-4 rounded-[4px_16px_16px_16px] bg-surface-alt items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot w-[7px] h-[7px] rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-8 px-6 gap-4">
      <div className="w-14 h-14 rounded-full bg-accent-soft border border-accent-line flex items-center justify-center">
        <MessageOutlined className="text-[26px] text-accent" />
      </div>
      <div className="text-center">
        <div className="text-base font-medium text-heading mb-1">
          开始对话
        </div>
        <div className="text-sm text-muted leading-[1.5]">
          告诉我你想看什么电影，我来帮你选
        </div>
      </div>
    </div>
  )
}

function SkeletonRow({ align, w = 160 }: { align: 'left' | 'right'; w?: number }) {
  const isLeft = align === 'left'
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`skeleton-pulse h-9 bg-surface-alt ${isLeft ? 'rounded-[4px_16px_16px_16px]' : 'rounded-[16px_16px_4px_16px]'}`}
        style={{ width: w }}
      />
    </div>
  )
}
