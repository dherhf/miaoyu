import { useEffect, useRef, useState, Suspense } from 'react'
import { NavBar, SpinLoading } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from './store'
import { useSSEChat, fetchSessionDetail } from './useSSEChat'
import { getCardComponent } from './card-registry'
import ErrorCardBoundary from './components/Cards/ErrorCardBoundary'

function dotStyle(delay: number): React.CSSProperties {
  return {
    width: 8, height: 8, borderRadius: '50%', background: '#9ca3af',
    animation: `typing-bounce 1.4s ${delay}s infinite`,
  }
}

const pageStyle: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: '#f3f4f6', maxWidth: 480, margin: '0 auto', width: '100%',
  },
  msgList: {
    flex: 1, overflowY: 'auto', padding: '12px 12px 8px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  userBubble: {
    alignSelf: 'flex-end', maxWidth: '75%',
    background: '#1677ff', color: '#fff', borderRadius: '12px 12px 4px 12px',
    padding: '10px 14px', fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word',
  },
  assistantWrap: {
    alignSelf: 'flex-start', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 8,
  },
  assistantBubble: {
    background: '#fff', borderRadius: '12px 12px 12px 4px',
    padding: '10px 14px', fontSize: 15, lineHeight: 1.5, color: '#1f2937',
    wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  cardWrap: {
    width: '100%',
  },
  typing: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
  },
  inputArea: {
    padding: '8px 12px 12px', background: '#fff', borderTop: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'flex-end', gap: 8,
  },
  textarea: {
    flex: 1, background: '#f3f4f6', borderRadius: 8,
    padding: '8px 12px', fontSize: 15, border: 'none', resize: 'none' as const,
    outline: 'none', minHeight: 40, maxHeight: 120,
  },
  sendBtn: {
    flexShrink: 0, height: 40, padding: '0 20px',
    borderRadius: 8, background: '#1677ff', color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  stopBtn: {
    flexShrink: 0, height: 40, padding: '0 16px',
    borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  emptyHint: {
    textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '60px 20px',
  },
  sessionBar: {
    padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 13,
  },
}

export default function AgentChatPage() {
  const navigate = useNavigate()
  const { send, stopGeneration } = useSSEChat()
  const store = useChatStore()
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const sessionTitle = useChatStore((s) => s.sessionTitle)
  const inputValue = useChatStore((s) => s.inputValue)
  const setInputValue = useChatStore((s) => s.setInputValue)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const setSessionId = useChatStore((s) => s.setSessionId)

  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 初始化：尝试恢复最近会话
  useEffect(() => {
    const init = async () => {
      try {
        const raw = localStorage.getItem('auth-storage')
        const token = raw ? JSON.parse(raw).state?.token : null
        if (!token) { setLoading(false); return }

        // 获取会话列表
        const res = await fetch('/api/v1/chat/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        const data = json.data || json
        const sessions = data.records || []
        const activeSession = sessions.find((s: any) => s.status === 'active')

        if (activeSession?.sessionId) {
          const detail = await fetchSessionDetail(activeSession.sessionId)
          if (detail) {
            setSessionId(activeSession.sessionId)
            loadMessages(detail.messages)
            if (activeSession.title) {
              store.setSessionTitle(activeSession.title)
            }
          }
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [setSessionId, loadMessages, store])

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // 处理发送
  const handleSend = async () => {
    const val = inputValue.trim()
    if (!val || isStreaming) return
    // 如果没有 session，先创建
    if (!store.sessionId) {
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
        if (res.ok) {
          const json = await res.json()
          const data = json.data || json
          if (data.sessionId) {
            store.setSessionId(data.sessionId)
          }
        }
      } catch { /* ignore */ }
    }
    await send(val)
  }

  // 处理键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理新对话
  const handleNewChat = () => {
    store.clearMessages()
  }

  if (loading) {
    return (
      <div style={pageStyle.container}>
        <NavBar onBack={() => navigate('/')}>妙语购票</NavBar>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SpinLoading color="primary" />
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle.container}>
      {/* 顶部导航 */}
      <NavBar
        onBack={() => navigate('/')}
        right={
          <span
            style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer' }}
            onClick={handleNewChat}
          >
            新对话
          </span>
        }
      >
        {sessionTitle}
      </NavBar>

      {/* 消息列表 */}
      <div style={pageStyle.msgList} ref={listRef}>
        {messages.length === 0 && (
          <div style={pageStyle.emptyHint}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: '#374151' }}>妙语购票</div>
            <div>说出你想看的电影，AI 帮你一站式购票</div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.msgId} style={pageStyle.userBubble}>
                {msg.content}
              </div>
            )
          }

          // Assistant 消息
          return (
            <div key={msg.msgId} style={pageStyle.assistantWrap}>
              {/* 文本气泡 */}
              {msg.content && (
                <div style={pageStyle.assistantBubble}>
                  {msg.content}
                  {msg.isStreaming && (
                    <span style={{ display: 'inline-block', width: 2, height: 16, background: '#1677ff', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                  )}
                </div>
              )}

              {/* 正在等待第一条消息 */}
              {msg.isStreaming && !msg.content && msg.cards.length === 0 && (
                <div style={pageStyle.assistantBubble}>
                  <div style={pageStyle.typing}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <div key={i} style={dotStyle(delay)} />
                    ))}
                  </div>
                </div>
              )}

              {/* 卡片列表 */}
              {msg.cards.map((card, ci) => {
                const CardComponent = getCardComponent(card.type)
                return (
                  <div key={`${msg.msgId}-card-${ci}`} style={pageStyle.cardWrap}>
                    <ErrorCardBoundary>
                      <Suspense
                        fallback={
                          <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                            卡片加载中...
                          </div>
                        }
                      >
                        <CardComponent data={card.data} onAction={(text) => send(text)} />
                      </Suspense>
                    </ErrorCardBoundary>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* 底部输入区 */}
      <div style={pageStyle.inputArea}>
        {isStreaming ? (
          <button style={pageStyle.stopBtn} onClick={stopGeneration}>
            停止生成
          </button>
        ) : (
          <>
            <textarea
              ref={inputRef}
              style={pageStyle.textarea}
              placeholder="说说你想看什么电影..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              style={{
                ...pageStyle.sendBtn,
                opacity: inputValue.trim() ? 1 : 0.4,
              }}
              disabled={!inputValue.trim()}
              onClick={handleSend}
            >
              发送
            </button>
          </>
        )}
      </div>

      {/* 动画 keyframes 注入 */}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
