import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Modal, Spin, Button, Tag, Result, App } from 'antd'
import { getSeatMap, lockSeat, payOrder } from '../api'
import { getPickupCode } from '@/features/order/api'
import type { ScheduleListVO, SeatMapVO, SeatVO, LockSeatResultVO, PayResultVO } from '../types'

const MAX_SEATS = 6

type Phase = 'seats' | 'confirm' | 'success'

export default function SeatMapModal({
  schedule,
  onClose,
}: {
  schedule: ScheduleListVO | null
  onClose: () => void
}) {
  const { message } = App.useApp()
  const [seatMap, setSeatMap] = useState<SeatMapVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState<SeatVO[]>([])
  const [phase, setPhase] = useState<Phase>('seats')
  const [lockResult, setLockResult] = useState<LockSeatResultVO | null>(null)
  const [payResult, setPayResult] = useState<PayResultVO | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const [pickupCode, setPickupCode] = useState<string | null>(null)
  const [pickupExpiresIn, setPickupExpiresIn] = useState(60)
  const pickupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSeatMap = useCallback(() => {
    if (!schedule) return
    setLoading(true)
    setPhase('seats')
    setSelectedSeats([])
    setLockResult(null)
    setPayResult(null)
    setPickupCode(null)
    setPickupExpiresIn(60)
    getSeatMap(schedule.id)
      .then(setSeatMap)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schedule])

  useEffect(() => {
    if (schedule) {
      fetchSeatMap()
    } else {
      setSeatMap(null)
    }
  }, [schedule, fetchSeatMap])

  // Build 2D grid: rowIndex → colIndex → SeatVO
  const seatGrid = useMemo(() => {
    if (!seatMap) return []
    const rowMap = new Map<number, Map<number, SeatVO>>()
    for (const seat of seatMap.seats) {
      let row = rowMap.get(seat.rowIndex)
      if (!row) {
        row = new Map()
        rowMap.set(seat.rowIndex, row)
      }
      row.set(seat.colIndex, seat)
    }
    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b)
    return sortedRows.map((rowIdx) => {
      const row = rowMap.get(rowIdx)!
      const maxCol = Math.max(...[...row.keys()])
      return { rowIndex: rowIdx, cols: Array.from({ length: maxCol }, (_, i) => row.get(i + 1) || null) }
    })
  }, [seatMap])

  const toggleSeat = (seat: SeatVO) => {
    if (seat.status !== 'available') return
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatIndex === seat.seatIndex)
      if (exists) {
        return prev.filter((s) => s.seatIndex !== seat.seatIndex)
      }
      if (prev.length >= MAX_SEATS) {
        message.warning(`最多可选 ${MAX_SEATS} 个座位`)
        return prev
      }
      return [...prev, seat]
    })
  }

  const isSelected = (seat: SeatVO) =>
    selectedSeats.some((s) => s.seatIndex === seat.seatIndex)

  const totalPrice = useMemo(() => {
    if (!schedule || selectedSeats.length === 0) return 0
    return Number(schedule.price) * selectedSeats.length
  }, [schedule, selectedSeats])

  const handleLockSeat = async () => {
    if (!schedule || selectedSeats.length === 0) return
    setSubmitting(true)
    try {
      const result = await lockSeat(
        schedule.id,
        selectedSeats.map((s) => s.hallCellId),
      )
      setLockResult(result)
      setPhase('confirm')
    } catch {
      // 拦截器已统一提示
    } finally {
      setSubmitting(false)
    }
  }

  const handlePay = async () => {
    if (!lockResult) return
    setSubmitting(true)
    try {
      const result = await payOrder(lockResult.id)
      setPayResult(result)
      setPickupCode(result.pickupCode || null)
      setPhase('success')
    } catch {
      // 拦截器已统一提示
    } finally {
      setSubmitting(false)
    }
  }

  const refreshPickupCode = useCallback(async (orderId: number) => {
    try {
      const res = await getPickupCode(orderId)
      setPickupCode(res.pickupCode)
      setPickupExpiresIn(res.expiresIn)
    } catch {
      // 拦截器已统一提示
    }
  }, [])

  // 确认阶段倒计时
  useEffect(() => {
    if (phase !== 'confirm' || !lockResult) return
    const init = lockResult.expireAt
      ? Math.max(0, Math.ceil((new Date(lockResult.expireAt).getTime() - Date.now()) / 1000))
      : (lockResult.remainingTime ?? 0)
    setCountdownSeconds(init)

    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) { clearInterval(countdownTimerRef.current); return 0 }
        return next
      })
    }, 1000)
    return () => { clearInterval(countdownTimerRef.current) }
  }, [phase, lockResult])

  useEffect(() => {
    if (phase !== 'success' || !payResult?.id) return
    refreshPickupCode(payResult.id)
    pickupTimerRef.current = setInterval(() => {
      setPickupExpiresIn((prev) => {
        if (prev <= 1) {
          refreshPickupCode(payResult.id)
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (pickupTimerRef.current) clearInterval(pickupTimerRef.current)
    }
  }, [phase, payResult, refreshPickupCode])

  const handleClose = () => {
    onClose()
  }

  const title = schedule
    ? `${schedule.cinemaName} · ${schedule.hallName} · ${schedule.showDate} ${schedule.startTime}`
    : ''

  return (
    <Modal
      title={title}
      open={!!schedule}
      onCancel={handleClose}
      width={720}
      footer={null}
      destroyOnClose
    >
      {loading ? (
        <div className="py-12 text-center"><Spin /></div>
      ) : phase === 'success' && payResult ? (
        <Result
          status="success"
          title="支付成功"
          subTitle={
            <div className="text-left">
              <p className="mb-1">取票码：<strong className="text-accent text-lg font-mono tracking-[2px]">{pickupCode || '...'}</strong> <span className="text-muted text-xs">{pickupExpiresIn}s 后刷新</span></p>
              <p className="mb-1 text-muted text-sm">影片：{payResult.movieName}</p>
              <p className="mb-1 text-muted text-sm">影院：{payResult.cinemaName}（{payResult.cinemaAddress}）</p>
              <p className="mb-1 text-muted text-sm">影厅：{payResult.hallName}</p>
              <p className="mb-1 text-muted text-sm">场次：{payResult.showDate} {payResult.startTime}</p>
              <p className="mb-1 text-muted text-sm">座位：{payResult.seatInfo}</p>
              <p className="text-muted text-sm">金额：¥{Number(payResult.totalAmount).toFixed(1)}</p>
            </div>
          }
          extra={
            <Button type="primary" onClick={handleClose}>完成</Button>
          }
        />
      ) : phase === 'confirm' && lockResult ? (
        <div className="py-4">
          <h3 className="text-base mb-3 text-heading">确认支付</h3>
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">订单号</span><span>{lockResult.orderNo}</span></div>
            <div className="flex justify-between"><span className="text-muted">影片</span><span>{lockResult.movieName}</span></div>
            <div className="flex justify-between"><span className="text-muted">影院</span><span>{lockResult.cinemaName}</span></div>
            <div className="flex justify-between"><span className="text-muted">影厅</span><span>{lockResult.hallName}</span></div>
            <div className="flex justify-between"><span className="text-muted">场次</span><span>{lockResult.showDate} {lockResult.startTime}</span></div>
            <div className="flex justify-between"><span className="text-muted">座位</span><span>{lockResult.seatInfo}</span></div>
            <div className="flex justify-between"><span className="text-muted">数量</span><span>{lockResult.ticketCount} 张</span></div>
            <div className="flex justify-between font-medium text-base pt-1"><span className="text-heading">合计</span><span className="text-accent">¥{Number(lockResult.totalAmount).toFixed(1)}</span></div>
          </div>

          {/* 支付倒计时 */}
          <div className="flex items-center justify-between rounded px-3 py-2 mb-3 border" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
            <span className="text-[13px]" style={{ color: 'var(--color-warning-text)' }}>支付倒计时</span>
            <span className={`font-mono text-base font-bold ${countdownSeconds > 0 && countdownSeconds <= 60 ? '' : ''}`} style={{ color: countdownSeconds > 0 && countdownSeconds <= 60 ? 'var(--color-warning-urgent)' : 'var(--color-warning-text)' }}>
              {String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:{String(countdownSeconds % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => { setPhase('seats'); setLockResult(null) }}>返回选座</Button>
            <Button type="primary" loading={submitting} onClick={handlePay} disabled={countdownSeconds <= 0} className="flex-1">
              {countdownSeconds <= 0 ? '订单已失效' : '立即支付'}
            </Button>
          </div>
        </div>
      ) : seatMap ? (
        <div>
          {/* Screen indicator */}
          <div className="mx-auto mb-6 w-[70%] h-2 rounded-t-[50%] bg-accent/30" />
          <p className="text-center text-xs text-muted mb-4">银幕</p>

          {/* Seat grid */}
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex flex-col gap-1.5 mx-auto min-w-full">
              {seatGrid.map((row) => (
                <div key={row.rowIndex} className="flex gap-1.5 justify-center items-center">
                  <span className="text-xs text-muted w-5 text-center shrink-0">{row.rowIndex}</span>
                  {row.cols.map((seat, colIdx) =>
                    seat ? (
                      <SeatCell
                        key={colIdx}
                        seat={seat}
                        selected={isSelected(seat)}
                        onClick={() => toggleSeat(seat)}
                      />
                    ) : (
                      <div key={colIdx} className="w-7 h-7 shrink-0" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center mt-4 mb-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-surface border border-border" />可选</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-accent" />已选</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-code-bg" />已锁定</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-danger/40" />已售</span>
          </div>

          {/* Selected seats + action bar */}
          <div className="border-t border-border pt-3 mt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                {selectedSeats.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {selectedSeats.map((s) => (
                      <Tag key={s.seatIndex} color="purple">{s.seatLabel}</Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted text-sm">请选择座位（最多 {MAX_SEATS} 个）</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-sm">
                  <span className="text-muted">{selectedSeats.length} 张 · </span>
                  <span className="text-accent font-medium text-base">¥{totalPrice.toFixed(1)}</span>
                </div>
                <Button
                  type="primary"
                  disabled={selectedSeats.length === 0}
                  loading={submitting}
                  onClick={handleLockSeat}
                >
                  锁座下单
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

function SeatCell({
  seat,
  selected,
  onClick,
}: {
  seat: SeatVO
  selected: boolean
  onClick: () => void
}) {
  const base = 'w-7 h-7 rounded text-[10px] flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0 select-none'

  if (selected) {
    return (
      <div className={`${base} bg-accent text-white`} onClick={onClick} title={seat.seatLabel}>
        {seat.colIndex}
      </div>
    )
  }

  if (seat.status === 'sold') {
    return (
      <div className={`${base} bg-danger/40 text-white/70 cursor-not-allowed`} title={`${seat.seatLabel}（已售）`}>
        {seat.colIndex}
      </div>
    )
  }

  if (seat.status === 'locked') {
    return (
      <div className={`${base} bg-code-bg text-muted cursor-not-allowed`} title={`${seat.seatLabel}（已锁定）`}>
        {seat.colIndex}
      </div>
    )
  }

  return (
    <div
      className={`${base} bg-surface border border-border text-muted hover:border-accent hover:text-accent`}
      onClick={onClick}
      title={seat.seatLabel}
    >
      {seat.colIndex}
    </div>
  )
}
