import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Tag, App } from 'antd'
import type { BaseCardProps, OrderConfirmCardData } from '../../types'

/** HH:mm 格式化秒数 */
function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const S: Record<string, React.CSSProperties> = {
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
  doneBanner: {
    padding: '12px 16px', textAlign: 'center' as const, fontWeight: 500, fontSize: 14,
    borderRadius: 8, margin: '0 16px 16px',
  },
}

export default function OrderConfirmCard({ data, onAction }: BaseCardProps<OrderConfirmCardData>) {
  const { modal } = App.useApp()
  const { id, status, movieName, cinemaName, hallName, showDate, startTime, seatInfo, ticketCount, totalAmount, orderNo, remainingTime, expireAt } = data || {}
  const calcInitial = () => {
    if (!expireAt) return remainingTime ?? 0
    const diff = Math.max(0, Math.ceil((new Date(expireAt).getTime() - Date.now()) / 1000))
    return diff
  }

  const [seconds, setSeconds] = useState(calcInitial)
  const [paying, setPaying] = useState(false)
  const [cancelled, setCancelled] = useState(false)
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
    if (expired || cancelled || status !== 'pending' || paying) return
    setPaying(true)
    try {
      onAction(`支付订单${orderNo}`)
    } finally {
      setPaying(false)
    }
  }, [expired, cancelled, status, paying, orderNo, onAction])

  const handleCancel = useCallback(() => {
    if (expired || cancelled) return
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: () => {
        setCancelled(true)
        onAction(`取消订单${id}`)
      },
    })
  }, [expired, cancelled, id, onAction])

  const isPaid = status === 'paid'
  const isCancelled = status === 'cancelled' || cancelled
  const disabled = expired || cancelled || status !== 'pending'

  const fmtShowTime = showDate && startTime ? `${showDate} ${startTime}` : '-'

  if (isPaid) {
    return (
      <div style={S.wrap}>
        <div style={{ ...S.doneBanner, background: '#f0fdf4', color: '#16a34a' }}>支付成功，祝您观影愉快！</div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      {/* 超时遮罩 */}
      {expired && !isCancelled && (
        <div style={S.overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#6b7280' }}>订单已超时</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>请重新选座</div>
        </div>
      )}

      {/* 取消遮罩 */}
      {isCancelled && (
        <div style={S.overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#6b7280' }}>订单已取消</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>座位已释放</div>
        </div>
      )}

      {/* 头部 */}
      <div style={S.header}>
        <span style={S.orderNo}>{orderNo}</span>
        <Tag color="warning" style={{ borderRadius: 999 }}>待支付</Tag>
      </div>

      {/* 影片信息 */}
      <div style={S.body}>
        <div style={S.movieRow}>
          <div style={S.movieIcon}>🎬</div>
          <div>
            <div style={S.movieName}>{movieName}</div>
            <div style={S.cinemaRow}>
              <span>{cinemaName}</span>
              <span>|</span>
              <span>{hallName}</span>
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div style={S.detailBg}>
          <div style={S.detailRow}><span>放映时间</span><span>{fmtShowTime}</span></div>
          <div style={S.detailRow}><span>座位信息</span><span>{seatInfo}</span></div>
          <div style={S.detailRow}><span>票数</span><span>{ticketCount}张</span></div>
        </div>
      </div>

      {/* 金额 */}
      <div style={S.amountRow}>
        <span style={{ fontSize: 14, color: '#6b7280' }}>订单金额</span>
        <span style={S.amount}>¥{totalAmount}</span>
      </div>

      {/* 倒计时 */}
      {!expired && (
        <div style={S.timerRow}>
          <span style={S.timerLabel}>支付倒计时</span>
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
      <div style={S.actions}>
        <Button
          type="primary"
          danger
          block
          disabled={disabled || paying}
          loading={paying}
          onClick={handlePay}
        >
          {expired ? '订单已失效' : `立即支付 ¥${totalAmount}`}
        </Button>
        <Button
          type="default"
          block
          disabled={disabled}
          onClick={handleCancel}
        >
          取消订单
        </Button>
      </div>
    </div>
  )
}
