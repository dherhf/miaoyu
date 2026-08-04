import { useState, useEffect, useRef } from 'react'
import type { BaseCardProps, PendingOrderCardData } from '../../types'

function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const sp = {
  wrap: { width: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' as const, position: 'relative' as const },
  overlay: {
    position: 'absolute' as const, inset: 0, background: 'rgba(255,255,255,0.95)', zIndex: 10,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
  },
  header: { padding: '8px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: 700, color: '#92400e' },
  body: { padding: '12px 16px' },
  tag: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' },
  tagLabel: { fontSize: 12, color: '#9ca3af', minWidth: 32 },
  amountRow: { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 20, fontWeight: 700, color: '#dc2626' },
  timerRow: { padding: '6px 16px', background: '#fef2f2', borderTop: '1px solid #fecaca', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  actions: { padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  payBtn: { width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 500 },
  cancelBtn: { width: '100%', padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 500 },
  disabledBtn: { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' },
}

export default function PendingOrderCard({ data, onAction }: BaseCardProps<PendingOrderCardData>) {
  const { id, movieName, cinemaName, seatInfo, totalAmount, remainingSeconds } = data || {}
  const [seconds, setSeconds] = useState(remainingSeconds ?? 0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const expired = seconds <= 0

  useEffect(() => {
    if (expired) return
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
        return next
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [expired])

  return (
    <div style={sp.wrap}>
      {expired && (
        <div style={sp.overlay}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>订单已超时释放</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>请重新选座购票</div>
        </div>
      )}

      <div style={sp.header}>
        <span style={{ fontSize: 18 }}>⏰</span>
        <span style={sp.headerTitle}>您有一笔待支付的订单</span>
      </div>

      <div style={sp.body}>
        <div style={sp.tag}>
          <span style={sp.tagLabel}>影片</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>🎬 {movieName}</span>
        </div>
        <div style={sp.tag}>
          <span style={sp.tagLabel}>影院</span>
          <span style={{ fontSize: 14, color: '#374151' }}>{cinemaName}</span>
        </div>
        <div style={sp.tag}>
          <span style={sp.tagLabel}>座位</span>
          <span style={{ fontSize: 14, color: '#374151' }}>{seatInfo}</span>
        </div>
        <div style={sp.amountRow}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>订单金额</span>
          <span style={sp.amount}>¥{totalAmount}</span>
        </div>
      </div>

      <div style={sp.timerRow}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#b91c1c' }}>剩余时间</span>
        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{fmtTime(seconds)}</span>
      </div>

      <div style={sp.actions}>
        <button disabled={expired} style={{ ...sp.payBtn, ...(expired ? sp.disabledBtn : {}) }} onClick={() => onAction(`支付订单${id}`)}>继续支付</button>
        <button disabled={expired} style={{ ...sp.cancelBtn, ...(expired ? sp.disabledBtn : {}) }} onClick={() => onAction(`取消订单${id}`)}>放弃订单</button>
      </div>
    </div>
  )
}
