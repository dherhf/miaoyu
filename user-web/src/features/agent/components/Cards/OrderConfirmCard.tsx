import { useState, useEffect, useRef, useCallback } from 'react'
import type { BaseCardProps, OrderConfirmCardData } from '../../types'

/** HH:mm 格式化秒数 */
function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const so = {
  wrap: {
    width: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
    overflow: 'hidden', position: 'relative' as const,
  },
  overlay: {
    position: 'absolute' as const, inset: 0, background: 'rgba(243,244,246,0.92)',
    zIndex: 10, display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center',
  },
  header: {
    padding: '8px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  orderNo: { fontSize: 12, fontFamily: 'monospace', color: '#9ca3af' },
  badge: { padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: '1px solid #fde68a', background: '#fef3c7', color: '#b45309' },
  body: { padding: '12px 16px' },
  movieRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  movieIcon: {
    width: 40, height: 40, borderRadius: 8,
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
  },
  movieName: { fontWeight: 700, fontSize: 15, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  cinemaRow: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9ca3af', marginTop: 2 },
  detailBg: { background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginTop: 12 },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' },
  amountRow: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 24, fontWeight: 700, color: '#dc2626' },
  timerRow: {
    padding: '6px 16px', background: '#fffbeb', borderTop: '1px solid #fde68a',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  timerLabel: { fontSize: 13, color: '#b45309' },
  actions: { padding: '8px 16px 12px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  payBtn: {
    width: '100%', padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500,
    border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff',
  },
  cancelBtn: {
    width: '100%', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#6b7280',
  },
  disabledBtn: { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' },
  doneBanner: {
    padding: '12px 16px', textAlign: 'center' as const, fontWeight: 500, fontSize: 14,
    borderRadius: 8, margin: '0 16px 16px',
  },
}

export default function OrderConfirmCard({ data, onAction }: BaseCardProps<OrderConfirmCardData>) {
  const { status, movieName, cinemaName, hallName, showDate, startTime, seatInfo, ticketCount, totalAmount, orderNo, remainingTime, expireAt } = data || {}
  const calcInitial = () => {
    if (!expireAt) return remainingTime ?? 0
    const diff = Math.max(0, Math.ceil((new Date(expireAt).getTime() - Date.now()) / 1000))
    return diff
  }

  const [seconds, setSeconds] = useState(calcInitial)
  const [showConfirm, setShowConfirm] = useState(false)
  const [paying, setPaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const expired = seconds <= 0
  const urgent = seconds > 0 && seconds <= 60

  // 倒计时
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

  const handlePay = useCallback(async () => {
    if (expired || status !== 'pending' || paying) return
    setPaying(true)
    try {
      onAction(`支付订单${orderNo}`)
    } finally {
      setPaying(false)
    }
  }, [expired, status, paying, orderNo, onAction])

  const handleCancel = useCallback(() => {
    if (expired) return
    setShowConfirm(true)
  }, [expired])

  const isPaid = status === 'paid'
  const isCancelled = status === 'cancelled'
  const disabled = expired || status !== 'pending'

  const fmtShowTime = showDate && startTime ? `${showDate} ${startTime}` : '-'

  if (isPaid) {
    return (
      <div style={so.wrap}>
        <div style={{ ...so.doneBanner, background: '#f0fdf4', color: '#16a34a' }}>支付成功，祝您观影愉快！</div>
      </div>
    )
  }

  if (isCancelled) {
    return (
      <div style={so.wrap}>
        <div style={{ ...so.doneBanner, background: '#f3f4f6', color: '#6b7280' }}>订单已取消</div>
      </div>
    )
  }

  return (
    <div style={so.wrap}>
      {/* 超时遮罩 */}
      {expired && (
        <div style={so.overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#6b7280' }}>订单已超时</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>请重新选座</div>
        </div>
      )}

      {/* 确认弹窗 */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfirm(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: 20, maxWidth: 320, width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>取消订单</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6b7280' }}>确定放弃这些座位吗？取消后座位将被释放。</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: 14, cursor: 'pointer' }}>关闭</button>
              <button onClick={() => { setShowConfirm(false); onAction(`取消订单${orderNo}`) }} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, cursor: 'pointer' }}>确认取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 头部 */}
      <div style={so.header}>
        <span style={so.orderNo}>{orderNo}</span>
        <span style={so.badge}>待支付</span>
      </div>

      {/* 影片信息 */}
      <div style={so.body}>
        <div style={so.movieRow}>
          <div style={so.movieIcon}>🎬</div>
          <div>
            <div style={so.movieName}>{movieName}</div>
            <div style={so.cinemaRow}>
              <span>{cinemaName}</span>
              <span>|</span>
              <span>{hallName}</span>
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div style={so.detailBg}>
          <div style={so.detailRow}><span>放映时间</span><span>{fmtShowTime}</span></div>
          <div style={so.detailRow}><span>座位信息</span><span>{seatInfo}</span></div>
          <div style={so.detailRow}><span>票数</span><span>{ticketCount}张</span></div>
        </div>
      </div>

      {/* 金额 */}
      <div style={so.amountRow}>
        <span style={{ fontSize: 14, color: '#6b7280' }}>订单金额</span>
        <span style={so.amount}>¥{totalAmount}</span>
      </div>

      {/* 倒计时 */}
      {!expired && (
        <div style={so.timerRow}>
          <span style={so.timerLabel}>支付倒计时</span>
          <span style={{
            fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
            color: urgent ? '#dc2626' : '#6b7280',
            animation: urgent ? 'pulse 1s infinite' : undefined,
          }}>
            {fmtTime(seconds)}
          </span>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={so.actions}>
        <button
          disabled={disabled || paying}
          style={{ ...so.payBtn, ...(disabled ? so.disabledBtn : {}) }}
          onClick={handlePay}
        >
          {expired ? '订单已失效' : paying ? '支付中...' : `立即支付 ¥${totalAmount}`}
        </button>
        <button
          disabled={disabled}
          style={{ ...so.cancelBtn, ...(disabled ? so.disabledBtn : {}) }}
          onClick={handleCancel}
        >
          取消订单
        </button>
      </div>
    </div>
  )
}
