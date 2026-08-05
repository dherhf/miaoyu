import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, SessionListCardData } from '../../types'

function getSeatInfo(n: number) {
  if (n === 0) return { text: '售罄', color: 'default' as const, soldOut: true }
  if (n < 10) return { text: `紧张 ${n}席`, color: 'error' as const, soldOut: false }
  if (n <= 20) return { text: `仅剩 ${n}席`, color: 'warning' as const, soldOut: false }
  return { text: '充足', color: 'success' as const, soldOut: false }
}

const S: Record<string, React.CSSProperties> = {
  group: { background: '#fff', borderRadius: 8, overflow: 'hidden' as const, marginBottom: 16 },
  groupTitle: { padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111' },
  item: { padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1, minWidth: 0 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  startTime: { fontSize: 24, fontWeight: 700, color: '#111' },
  endTime: { fontSize: 13, color: '#9ca3af' },
  hall: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  right: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4, minWidth: 80 },
  price: { fontSize: 16, fontWeight: 700, color: '#dc2626' },
  btnArea: { marginLeft: 12 },
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
        <div key={cinemaName} style={S.group}>
          <div style={S.groupTitle}>{cinemaName}</div>
          {list.map((s) => {
            const seat = getSeatInfo(s.availableSeats)
            const today = new Date()
            const showMonth = parseInt(s.showDate.split('-')[1], 10)
            const showDay = parseInt(s.showDate.split('-')[2], 10)
            const cross = showMonth !== today.getMonth() + 1 || showDay !== today.getDate()
            const dateLabel = `${showMonth}月${showDay}日`
            return (
              <div key={s.id} style={S.item}>
                <div style={S.left}>
                  <div style={S.timeRow}>
                    <span style={S.startTime}>{s.startTime}</span>
                    {cross && <Tag color="processing">{dateLabel}</Tag>}
                  </div>
                  <div style={S.endTime}>{s.endTime} 散场</div>
                  <div style={S.hall}>{s.hallName} · {s.languageVersion}</div>
                </div>
                <div style={S.right}>
                  <span style={S.price}>¥{Number(s.price).toFixed(1)}</span>
                  <Tag color={seat.color}>{seat.text}</Tag>
                </div>
                <div style={S.btnArea}>
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
