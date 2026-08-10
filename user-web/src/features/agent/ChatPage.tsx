import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App, Drawer, Popconfirm } from 'antd'
import { DeleteOutlined, MessageOutlined, PlusOutlined, SendOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Streamdown } from 'streamdown'
import { createSession, deleteSession, getSessionDetail, listSessions, sendMessage } from './api'
import CardRenderer from './components/CardRenderer'
import type { ChatMessage, SessionSummary, SseCallbacks } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'
import { useGeoStore } from '@/shared/amap'

/**
 * 对话主页面 —— 妙语购票 Agent 的核心交互页面。
 *
 * 功能：
 * - 左侧侧边栏 / 移动端抽屉展示会话列表，支持新建 / 切换 / 删除
 * - 中间为消息流区域，支持用户消息与 AI 助手消息（文本 + 卡片）
 * - 底部输入框发送消息，通过 SSE 流式接收 AI 回复
 * - 卡片内的操作（如选影院、选座、支付）通过 onAction 回调发起新消息
 */
export default function ChatPage() {
  const { id } = useParams<{ id: string }>()             // 路由参数中的会话 ID（新对话时无）
  const navigate = useNavigate()
  const { message } = App.useApp()                         // Ant Design 全局 message 实例
  const [messages, setMessages] = useState<ChatMessage[]>([]) // 当前会话的消息列表
  const [sessions, setSessions] = useState<SessionSummary[]>([]) // 会话列表
  const [activeId, setActiveId] = useState<string | undefined>(id) // 当前激活的会话 ID
  const [loading, setLoading] = useState(Boolean(id))      // 是否正在加载会话详情
  const [input, setInput] = useState('')                  // 输入框内容
  const [sending, setSending] = useState(false)           // 是否正在发送消息等待回复
  const [drawerOpen, setDrawerOpen] = useState(false)     // 移动端抽屉开关
  const messagesEndRef = useRef<HTMLDivElement>(null)    // 消息底部 ref（用于滚动到底）
  const textareaRef = useRef<HTMLTextAreaElement>(null)  // 输入框 ref（用于自适应高度）
  const locallyCreatedRef = useRef<string | null>(null)  // 本地创建的会话 ID（避免与路由 useEffect 重复请求）
  const location = useGeoStore((s) => s.location)        // 用户当前定位信息（经纬度 + 城市）

  // 启用顶部导航栏返回按钮，返回首页
  useHeaderBack(true, '/')

  // 初始化：加载会话列表
  useEffect(() => {
    listSessions(0, 50)
      .then((res) => setSessions(res.records))
      .catch(() => {})
  }, [])

  // 路由变化时：加载对应会话的历史消息；无 id 则进入新对话模式
  useEffect(() => {
    if (!id) {
      // 无会话 ID，进入新对话
      setActiveId(undefined)
      setMessages([])
      setLoading(false)
      return
    }
    setActiveId(id)
    // 如果是本地刚创建的会话，跳过后端拉取（消息已在内存中）
    if (locallyCreatedRef.current === id) {
      locallyCreatedRef.current = null
      return
    }
    setLoading(true)
    getSessionDetail(id)
      .then((detail) => {
        // 将后端返回的消息列表转为本地 ChatMessage 格式
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
      .catch((err) => {
        // 会话不存在（404）时退回 /chat 新对话
        if (err?.response?.status === 404) {
          navigate('/chat', { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  // 滚动到底部（消息更新时自动调用）
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 输入框自适应高度：随内容增长，上限 100px
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }, [])

  /** 构造 SSE 回调（handleSend 和 handleCardAction 共用） */
  const createSseCallbacks = useCallback((): SseCallbacks => {
    return {
      // 收到文本增量：追加到当前 assistant 消息末尾
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
      // 收到卡片：追加到当前 assistant 消息的卡片列表，并标记为非 pending
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
      // 收到完成事件：标记最后一条 assistant 消息为非 pending；若后端给了新标题则更新会话列表
      onDone: (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = { ...next[lastIndex], pending: false }
          }
          return next
        })
        if (event.title) {
          // 后端自动生成了标题，更新左侧会话列表中对应会话的标题
          setSessions((prev) => prev.map((s) =>
            s.sessionId === event.sessionId ? { ...s, title: event.title! } : s
          ))
        }
      },
      // 收到错误：提示用户，并给 assistant 消息设置兜底文案
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
    // 无当前会话 → 先创建一个新会话
    const session = await createSession()
    locallyCreatedRef.current = session.sessionId
    navigate(`/chat/${session.sessionId}`, { replace: true })
    // 在会话列表头部插入新会话摘要
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

  /** 发送消息到后端 SSE，将用户消息与 assistant 占位消息加入列表，再调用 sendMessage 流式接收 */
  const sendToBackend = useCallback(async (content: string) => {
    let sid = activeId
    if (!sid) {
      try {
        sid = await ensureSession()
      } catch {
        return
      }
    }
    // 添加用户消息
    const userMsg: ChatMessage = { role: 'user', content, cards: [] }
    // 添加 assistant 占位消息（pending = true，等待流式填充）
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', cards: [], pending: true }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    setSending(true)
    // 发送消息，附带用户定位信息（用于周边查询 / 影院排序等）
    await sendMessage(sid, content, createSseCallbacks(), {
      longitude: location?.longitude,
      latitude: location?.latitude,
      city: location?.city,
    })
    setSending(false)
  }, [activeId, createSseCallbacks, ensureSession, location])

  /** 发送按钮：处理输入并发送 */
  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendToBackend(content)
  }

  /** 新建对话：导航到 /chat（无会话 ID） */
  const handleNewChat = () => {
    navigate('/chat')
  }

  /** 删除会话：调用后端删除并更新本地列表，若删除的是当前会话则退回新对话 */
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      message.success('已删除')
      if (activeId === sessionId) {
        setActiveId(undefined)
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

  /** 输入框键盘事件：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /** 会话列表内容（桌面侧边栏和移动端抽屉共用） */
  const renderSessionList = (onNavigate?: () => void) => (
    <>
      {/* 新建对话按钮 */}
      <div className="p-2 border-b border-border">
        <button
          onClick={() => {
            handleNewChat()
            onNavigate?.()
          }}
          className="w-full h-9 rounded-lg border border-dashed border-accent-line bg-accent-soft text-accent text-sm font-medium cursor-pointer flex items-center justify-center gap-1 transition-colors duration-150"
        >
          <PlusOutlined />
          新对话
        </button>
      </div>
      {/* 会话列表：点击切换，右侧删除按钮 */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {sessions.map((s) => (
          <div
            key={s.sessionId}
            onClick={() => {
              if (s.sessionId !== activeId) {
                navigate(`/chat/${s.sessionId}`)
                onNavigate?.()
              }
            }}
            className={`group flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors duration-150 ${
              s.sessionId === activeId
                ? 'bg-accent-soft text-accent font-medium'
                : 'text-heading hover:bg-surface-alt'
            }`}
          >
            <span className="flex-1 min-w-0 truncate">{s.title || '新对话'}</span>
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <Popconfirm
                title="确定删除此对话?"
                okText="删除"
                cancelText="取消"
                onConfirm={() => handleDeleteSession(s.sessionId)}
              >
                <DeleteOutlined className="text-muted text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer p-1" />
              </Popconfirm>
            </span>
          </div>
        ))}
      </div>
    </>
  )

  // 桌面端：固定侧边栏 + 中间消息区 + 输入框；移动端：抽屉替代侧边栏
  return (
    <div className="h-full flex">
      {/* 桌面端会话侧边栏 */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface">
        {renderSessionList()}
      </aside>

      {/* 消息区 + 输入框 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 移动端：顶部栏按钮打开抽屉 */}
        <div className="md:hidden flex items-center px-3 h-10 border-b border-border bg-surface flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-heading transition-colors duration-150 cursor-pointer"
          >
            <UnorderedListOutlined />
            历史记录
          </button>
        </div>
        {loading ? (
          /* 加载中骨架屏 */
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
              <SkeletonRow align="left" />
              <SkeletonRow align="right" />
              <SkeletonRow align="left" w={220} />
            </div>
          </div>
        ) : (
          /* 消息列表区 */
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
              {/* 空对话引导 */}
              {messages.length === 0 && <EmptyChat />}

              {/* 渲染每条消息气泡 */}
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} onCardAction={handleCardAction} />
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* 底部输入区 */}
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
          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={`w-9 h-9 rounded-full border-none flex items-center justify-center shrink-0 text-lg transition-[background,transform] duration-200 ${input.trim() && !sending ? 'bg-accent text-white cursor-pointer shadow-[0_2px_8px_var(--color-accent-soft)]' : 'bg-code-bg text-muted cursor-not-allowed'}`}
          >
            <SendOutlined />
          </button>
        </div>
      </div>

      {/* 移动端历史记录抽屉 */}
      <Drawer
        title="历史记录"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={280}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        {renderSessionList(() => setDrawerOpen(false))}
      </Drawer>
    </div>
  )
}

/**
 * 消息气泡组件：根据角色渲染不同样式的消息。
 * 用户消息为右侧紫色气泡；助手消息为左侧灰白气泡，支持 Markdown 流式渲染与卡片展示。
 */
function MessageBubble({
  message,
  onCardAction,
}: {
  message: ChatMessage
  onCardAction: (text: string) => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    // 用户消息：右对齐紫色气泡
    return (
      <div className="chat-bubble-enter flex justify-end">
        <div className="max-w-[78%] py-[9px] px-[14px] rounded-[16px_16px_4px_16px] bg-accent text-white text-[15px] leading-[1.5] break-words shadow-[0_1px_3px_rgba(170,59,255,0.2)]">
          {message.content}
        </div>
      </div>
    )
  }

  // 助手消息：左对齐灰白气泡
  return (
    <div className="chat-bubble-enter flex justify-start">
      <div className="max-w-[85%] flex flex-col gap-1">
        {/* pending 且无内容无卡片 → 显示打字中动画 */}
        {message.pending && !message.content && message.cards.length === 0 ? (
          <TypingIndicator />
        ) : (
          <>
            {/* 文本内容：使用 Streamdown 支持流式 Markdown 渲染 */}
            {message.content && (
              <div className="py-[9px] px-[14px] rounded-[4px_16px_16px_16px] bg-surface-alt text-heading text-[15px] leading-[1.5] break-words">
                <Streamdown isAnimating={message.pending}>
                  {message.content}
                </Streamdown>
              </div>
            )}
            {/* 渲染所有关联卡片 */}
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

/** 打字中动画指示器（三个脉冲圆点） */
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

/** 空对话引导：展示欢迎语和功能提示 */
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

/** 骨架屏行：加载会话详情时的占位
 *  @param align 对齐方向：left 左（助手）/ right 右（用户）
 *  @param w 骨架宽度（px）
 */
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
