import type { BaseCardProps, SessionListCardData } from '../../types'

function getSeatLabel(n: number) {
  if (n === 0) return { text: '售罄', color: '#9ca3af', bg: '#f3f4f6', soldOut: true }
  if (n < 10) return { text: `紧张 ${n}席`, color: '#dc2626', bg: '#fef2f2', soldOut: false }
  if (n <= 20) return { text: `仅剩 ${n}席`, color: '#ea580c', bg: '#fff7ed', soldOut: false }
  return { text: '充足', color: '#16a34a', bg: '#f0fdf4', soldOut: false }
}

const st = {
  group: { background: '#fff', borderRadius: 8, overflow: 'hidden' as const, marginBottom: 16 },
  groupTitle: { padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111' },
  item: { padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1, minWidth: 0 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  startTime: { fontSize: 24, fontWeight: 700, color: '#111' },
  dateTag: { fontSize: 11, padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4 },
  endTime: { fontSize: 13, color: '#9ca3af' },
  hall: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  right: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4, minWidth: 80 },
  price: { fontSize: 16, fontWeight: 700, color: '#dc2626' },
  seatTag: { fontSize: 11, padding: '2px 6px', borderRadius: 4 },
  btnArea: { marginLeft: 12 },
  buyBtn: { padding: '6px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const, background: '#dc2626', color: '#fff' },
  soldOutBtn: { padding: '6px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'not-allowed', whiteSpace: 'nowrap' as const, background: '#f3f4f6', color: '#9ca3af' },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },
}

export default function SessionListCard({ data, onAction }: BaseCardProps<SessionListCardData>) {
  const sessions = data?.sessions || []
  if (sessions.length === 0) {
    return <div style={st.empty}><span style={{ fontSize: 48, marginBottom: 8 }}>🎫</span><span>暂无符合条件的场次</span></div>
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
        <div key={cinemaName} style={st.group}>
          <div style={st.groupTitle}>{cinemaName}</div>
          {list.map((s) => {
            const seat = getSeatLabel(s.availableSeats)
            const today = new Date()
            const showMonth = parseInt(s.showDate.split('-')[1], 10)
            const showDay = parseInt(s.showDate.split('-')[2], 10)
            const cross = showMonth !== today.getMonth() + 1 || showDay !== today.getDate()
            const dateLabel = `${showMonth}月${showDay}日`
            return (
              <div key={s.id} style={st.item}>
                <div style={st.left}>
                  <div style={st.timeRow}>
                    <span style={st.startTime}>{s.startTime}</span>
                    {cross && <span style={st.dateTag}>{dateLabel}</span>}
                  </div>
                  <div style={st.endTime}>{s.endTime} 散场</div>
                  <div style={st.hall}>{s.hallName} · {s.languageVersion}</div>
                </div>
                <div style={st.right}>
                  <span style={st.price}>¥{Number(s.price).toFixed(1)}</span>
                  <span style={{ ...st.seatTag, background: seat.bg, color: seat.color }}>{seat.text}</span>
                </div>
                <div style={st.btnArea}>
                  <button
                    disabled={seat.soldOut}
                    style={seat.soldOut ? st.soldOutBtn : st.buyBtn}
                    onClick={() => !seat.soldOut && onAction(`选${s.id}号场次——${s.startTime} ${s.hallName}`)}
                  >
                    {seat.soldOut ? '已售罄' : '选座购票'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
