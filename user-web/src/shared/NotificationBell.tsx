import { Badge, Button, Empty, Popover, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useMemo } from 'react'
import type { NotificationVO } from '@/features/notification/types'

interface NotificationBellProps {
  items: NotificationVO[]
  onRead?: (id: number) => void
}

function formatTime(dt: string): string {
  if (!dt) return ''
  const date = new Date(dt)
  if (isNaN(date.getTime())) return dt
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneMin = 60 * 1000
  const oneHour = 60 * oneMin
  const oneDay = 24 * oneHour
  if (diff < oneMin) return '刚刚'
  if (diff < oneHour) return `${Math.floor(diff / oneMin)}分钟前`
  if (diff < oneDay && now.getDate() === date.getDate()) {
    return `${Math.floor(diff / oneHour)}小时前`
  }
  if (diff < 2 * oneDay) return '昨天'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

// isRead 0 表示未读 1 表示已读
export default function NotificationBell({ items, onRead }: NotificationBellProps) {
  const unreadCount = useMemo(
    () => items.filter((i) => i.isRead === 0).length,
    [items],
  )

  const content = items.length === 0 ? (
    <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} className="my-2" />
  ) : (
    <div className="w-[min(320px,calc(100vw-1.5rem))] max-h-[400px] overflow-auto">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => item.isRead === 0 && onRead?.(item.id)}
          className={`py-2.5 px-3 border-b border-border${item.isRead === 0 ? ' cursor-pointer' : ''}${item.isRead === 1 ? ' opacity-60' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.isRead === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            )}
            <Typography.Text strong className="text-sm! break-words">
              {item.title}
            </Typography.Text>
          </div>
          <Typography.Text type="secondary" className="text-[13px]! break-words">
            {item.content}
          </Typography.Text>
          <div className="text-xs text-muted mt-0.5">
            {formatTime(item.createdAt)}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Badge count={unreadCount} size="small" offset={[-2, 2]}>
      {/* 气泡框位置:右下角,触发方式:点击 */}
      <Popover content={content} placement="bottomRight" trigger="click" arrow={false}>
        <Button type="text" icon={<BellOutlined />} className="px-2! py-1!" />
      </Popover>
    </Badge>
  )
}
