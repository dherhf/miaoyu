import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { App } from 'antd'
import { MessageOutlined, SendOutlined } from '@ant-design/icons'
import { getSessionDetail, sendMessage } from './api'
import CardRenderer from './components/CardRenderer'
import type { ChatMessage } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const { message } = App.useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useHeaderBack(true, '/chat')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSessionDetail(id)
      .then((detail) => {
        setMessages(
          detail.messages.map((m) => ({
            msgId: m.msgId,
            role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
            cardType: m.cardType,
            cardData: m.cardData,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !id || sending) return

    setInput('')
    setSending(true)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const userMsg: ChatMessage = { role: 'user', content }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', pending: true }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    await sendMessage(id, content, {
      onMessage: (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            last.content += event.content
            last.pending = false
          }
          return [...next]
        })
      },
      onCard: (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            last.cardType = event.cardType
            last.cardData = event.cardData
            last.pending = false
          }
          return [...next]
        })
      },
      onDone: () => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            last.pending = false
          }
          return [...next]
        })
      },
      onError: (event) => {
        message.error(event.message || '对话异常')
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            if (!last.content) {
              last.content = '抱歉，回复出现了问题，请重试。'
            }
            last.pending = false
          }
          return [...next]
        })
      },
    })

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="h-full p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
        <div className="flex flex-col gap-4">
          <SkeletonRow align="left" />
          <SkeletonRow align="right" />
          <SkeletonRow align="left" w={220} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col gap-4 overflow-auto p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
        {messages.length === 0 && <EmptyChat />}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

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
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
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
        {message.pending && !message.content ? (
          <TypingIndicator />
        ) : (
          <>
            {message.content && (
              <div className="py-[9px] px-[14px] rounded-[4px_16px_16px_16px] bg-surface-alt text-heading text-[15px] leading-[1.5] break-words whitespace-pre-wrap">
                {message.content}
              </div>
            )}
            {message.cardType && (
              <CardRenderer cardType={message.cardType} cardData={message.cardData} />
            )}
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
