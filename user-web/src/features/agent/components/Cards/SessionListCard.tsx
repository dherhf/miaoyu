import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, SessionListCardData } from '../../types'

function getSeatInfo(n: number) {
  if (n === 0) return { text: '售罄', color: 'default' as const, soldOut: true }
  if (n < 10) return { text: `紧张 ${n}席`, color: 'error' as const, soldOut: false }
  if (n <= 20) return { text: `仅剩 ${n}席`, color: 'warning' as const, soldOut: false }
  return { text: '充足', color: 'success' as const, soldOut: false }
}

export default function SessionListCard({ data, onAction }: BaseCardProps<SessionListCardData>) {
  const sessions = data?.records || []
  if (sessions.length === 0) {
    return <Empty description="暂无符合条件的场次" />
  }

  // 按影院分组
  const groups: Record<string, typeof sessions> = {}
  sessions.forEach((s) => {
    const key = s.cinemaName || '未知影院'
    ;(groups[key] ||= []).push(s)
  })

  return (
    <div>
      {Object.entries(groups).map(([cinemaName, list]) => (
        <div key={cinemaName} className="bg-surface rounded-lg overflow-hidden mb-4 last:mb-0">
          <div className="px-4 py-2 bg-subtle-bg border-b border-border font-bold text-sm text-heading">{cinemaName}</div>
          {list.map((s) => {
            const seat = getSeatInfo(s.availableSeats)
            const today = new Date()
            const showMonth = parseInt(s.showDate.split('-')[1], 10)
            const showDay = parseInt(s.showDate.split('-')[2], 10)
            const cross = showMonth !== today.getMonth() + 1 || showDay !== today.getDate()
            const dateLabel = `${showMonth}月${showDay}日`
            return (
              <div key={s.id} className="px-4 py-2.5 border-b border-border last:border-b-0 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-2xl font-bold text-heading">{s.startTime}</span>
                    {cross && <Tag color="processing">{dateLabel}</Tag>}
                  </div>
                  <div className="text-[13px] text-muted">{s.endTime} 散场</div>
                  <div className="text-[13px] text-muted mt-0.5">{s.hallName} · {s.languageVersion}</div>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[80px]">
                  <span className="text-base font-bold text-price">¥{Number(s.price).toFixed(1)}</span>
                  <Tag color={seat.color}>{seat.text}</Tag>
                </div>
                <div className="ml-3">
                  <Button
                    size="small"
                    type="primary"
                    danger
                    disabled={seat.soldOut}
                    onClick={() => { if (!seat.soldOut) onAction(`选${s.id}号场次——${s.startTime} ${s.hallName}`) }}
                  >
                    {seat.soldOut ? '已售罄' : '选座购票'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
