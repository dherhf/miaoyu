import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Popconfirm } from 'antd'
import { MessageOutlined, PlusOutlined, VideoCameraOutlined, DeleteOutlined } from '@ant-design/icons'
import { createSession, deleteSession, listSessions } from './api'
import type { SessionSummary } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

const PAGE_SIZE = 20

export default function ChatListPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const loadingRef = useRef(false)

  useHeaderBack(true, '/')

  const fetchSessions = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await listSessions(0, PAGE_SIZE)
      setSessions(res.records)
    } catch {
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const session = await createSession()
      navigate(`/chat/${session.sessionId}`)
    } catch {
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      message.success('已删除')
    } catch {
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-pulse h-16 rounded-xl bg-surface-alt"
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState onCreate={handleCreate} creating={creating} />
      ) : (
        <>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full h-11 rounded-xl border border-dashed border-accent-line bg-accent-soft text-accent text-[15px] font-medium cursor-pointer mb-3 flex items-center justify-center gap-1.5 transition-colors duration-150"
          >
            <PlusOutlined />
            新建对话
          </button>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {sessions.map((s) => (
              <Popconfirm
                key={s.sessionId}
                title="确定删除此对话?"
                okText="删除"
                cancelText="取消"
                onConfirm={() => handleDelete(s.sessionId)}
              >
                <div className="relative">
                  <SessionItem
                    session={s}
                    onClick={() => navigate(`/chat/${s.sessionId}`)}
                  />
                  <DeleteOutlined className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-base cursor-pointer p-1" />
                </div>
              </Popconfirm>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SessionItem({
  session,
  onClick,
}: {
  session: SessionSummary
  onClick: () => void
}) {
  const time = formatTime(session.lastMessageAt || session.createdAt)
  const statusLabel =
    session.status === 'completed' ? '已完成' :
    session.status === 'expired' ? '已过期' : ''

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-3.5 pr-10 pl-4 rounded-xl bg-surface-alt cursor-pointer border border-border transition-colors duration-150"
    >
      <div className="w-10 h-10 rounded-full bg-accent-soft border border-accent-line flex items-center justify-center shrink-0">
        <MessageOutlined className="text-xl text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <span className="text-base font-medium text-heading overflow-hidden text-ellipsis whitespace-nowrap">
            {session.title || '新对话'}
          </span>
          <span className="text-xs text-muted shrink-0">
            {time}
          </span>
        </div>
        {statusLabel && (
          <span className="text-xs text-muted mt-0.5 inline-block">
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  onCreate,
  creating,
}: {
  onCreate: () => void
  creating: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 gap-5">
      <div className="w-16 h-16 rounded-full bg-accent-soft border border-accent-line flex items-center justify-center">
        <VideoCameraOutlined className="text-[28px] text-accent" />
      </div>
      <div className="text-center">
        <div className="text-base font-medium text-heading mb-1">
          还没有对话记录
        </div>
        <div className="text-sm text-muted leading-[1.5]">
          创建一个新对话，让我帮你选电影购票吧
        </div>
      </div>
      <Button
        onClick={onCreate}
        loading={creating}
        icon={<PlusOutlined />}
        style={{
          height: '44px',
          borderRadius: '12px',
          border: '1px dashed var(--color-accent-line)',
          background: 'var(--color-accent-soft)',
          color: 'var(--color-accent)',
          fontSize: '15px',
          fontWeight: 500,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        {creating ? '创建中...' : '新建对话'}
      </Button>
    </div>
  )
}

function formatTime(dt: string): string {
  if (!dt) return ''
  const date = new Date(dt)
  if (isNaN(date.getTime())) return dt
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneDay = 24 * 60 * 60 * 1000
  if (diff < oneDay && now.getDate() === date.getDate()) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  if (diff < 2 * oneDay) return '昨天'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}
