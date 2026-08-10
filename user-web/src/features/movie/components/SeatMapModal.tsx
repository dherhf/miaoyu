import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Modal, Spin, Button, Tag, Result, App } from 'antd'
import { getSeatMap, lockSeat, payOrder } from '../api'
import { getPickupCode, cancelOrder } from '@/features/order/api'
import type { ScheduleListVO, SeatMapVO, SeatVO, LockSeatResultVO, PayResultVO } from '../types'

/** 每次最多可选座位数 */
const MAX_SEATS = 6

/** 弹窗阶段：选座 → 确认支付 → 支付成功 */
type Phase = 'seats' | 'confirm' | 'success'

/** 座位图弹窗属性 */
interface SeatMapModalProps {
  /** 当前选中的场次（为 null 时弹窗关闭） */
  schedule: ScheduleListVO | null
  /** 关闭弹窗的回调 */
  onClose: () => void
}

/**
 * 座位图弹窗组件。
 * 包含三个阶段：
 * 1. seats（选座）：展示座位图，用户选择座位后点击"锁座下单"
 * 2. confirm（确认支付）：展示订单信息，含支付倒计时，点击"立即支付"
 * 3. success（支付成功）：展示取票码和订单详情，取票码定期刷新
 *
 * 支持取消订单（释放座位）并返回选座阶段。
 * @param schedule 当前场次
 * @param onClose 关闭回调
 */
export default function SeatMapModal({ schedule, onClose }: SeatMapModalProps) {
  const { message, modal } = App.useApp()
  // 座位图数据
  const [seatMap, setSeatMap] = useState<SeatMapVO | null>(null)
  // 加载状态
  const [loading, setLoading] = useState(false)
  // 用户选中的座位列表
  const [selectedSeats, setSelectedSeats] = useState<SeatVO[]>([])
  // 当前弹窗阶段
  const [phase, setPhase] = useState<Phase>('seats')
  // 锁座结果（订单信息）
  const [lockResult, setLockResult] = useState<LockSeatResultVO | null>(null)
  // 支付结果
  const [payResult, setPayResult] = useState<PayResultVO | null>(null)
  // 提交中状态（锁座/支付）
  const [submitting, setSubmitting] = useState(false)
  // 支付倒计时剩余秒数
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  // 支付倒计时定时器
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  // 取票码
  const [pickupCode, setPickupCode] = useState<string | null>(null)
  // 取票码刷新倒计时（秒）
  const [pickupExpiresIn, setPickupExpiresIn] = useState(60)
  // 取票码刷新定时器
  const pickupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * 获取座位图数据并重置弹窗状态。
   * 每次打开弹窗或取消订单后调用。
   */
  const fetchSeatMap = useCallback(() => {
    if (!schedule) return Promise.resolve()
    setLoading(true)
    // 重置为选座阶段
    setPhase('seats')
    setSelectedSeats([])
    setLockResult(null)
    setPayResult(null)
    setPickupCode(null)
    setPickupExpiresIn(60)
    return getSeatMap(schedule.id)
      .then(setSeatMap)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schedule])

  // 场次变化时加载座位图
  useEffect(() => {
    if (schedule) {
      fetchSeatMap()
    } else {
      setSeatMap(null)
    }
  }, [schedule, fetchSeatMap])

  /**
   * 构建二维座位网格：行索引 → 列索引 → 座位对象。
   * 将扁平的座位数组转换为行列矩阵，方便渲染。
   */
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
    // 按行索引排序，每行按列索引填充（空位用 null 占位）
    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b)
    return sortedRows.map((rowIdx) => {
      const row = rowMap.get(rowIdx)!
      const maxCol = Math.max(...[...row.keys()])
      return { rowIndex: rowIdx, cols: Array.from({ length: maxCol }, (_, i) => row.get(i + 1) || null) }
    })
  }, [seatMap])

  /**
   * 切换座位选中状态。
   * 已选中的取消选中，未选中的添加选中（受 MAX_SEATS 限制）。
   * @param seat 座位对象
   */
  const toggleSeat = (seat: SeatVO) => {
    if (seat.status !== 'available') return
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatIndex === seat.seatIndex)
      if (exists) {
        // 已选中则取消
        return prev.filter((s) => s.seatIndex !== seat.seatIndex)
      }
      // 超过最大选座数则提示
      if (prev.length >= MAX_SEATS) {
        message.warning(`最多可选 ${MAX_SEATS} 个座位`)
        return prev
      }
      return [...prev, seat]
    })
  }

  /** 判断座位是否已选中 */
  const isSelected = (seat: SeatVO) =>
    selectedSeats.some((s) => s.seatIndex === seat.seatIndex)

  // 计算总价：单价 × 选座数量
  const totalPrice = useMemo(() => {
    if (!schedule || selectedSeats.length === 0) return 0
    return Number(schedule.price) * selectedSeats.length
  }, [schedule, selectedSeats])

  /** 锁座下单：调用后端锁定座位并创建待支付订单 */
  const handleLockSeat = async () => {
    if (!schedule || selectedSeats.length === 0) return
    setSubmitting(true)
    try {
      const result = await lockSeat(
        schedule.id,
        selectedSeats.map((s) => s.hallCellId),
      )
      setLockResult(result)
      // 进入确认支付阶段
      setPhase('confirm')
    } catch {
      // 拦截器已统一提示
    } finally {
      setSubmitting(false)
    }
  }

  /** 立即支付：调用后端支付接口，成功后进入支付成功阶段 */
  const handlePay = async () => {
    if (!lockResult) return
    setSubmitting(true)
    try {
      const result = await payOrder(lockResult.id)
      setPayResult(result)
      setPickupCode(result.pickupCode || null)
      // 进入支付成功阶段
      setPhase('success')
    } catch {
      // 拦截器已统一提示
    } finally {
      setSubmitting(false)
    }
  }

  /** 取消订单：弹出确认框，确认后调用后端取消订单并返回选座阶段 */
  const handleCancelOrder = () => {
    if (!lockResult) return
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: async () => {
        try {
          await cancelOrder(lockResult.id)
          message.success('订单已取消')
          // 取消后重新加载座位图（座位状态会更新）
          await fetchSeatMap()
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }

  /**
   * 刷新取票码。
   * 取票码有过期时间，到期后自动刷新获取新码。
   * @param orderId 订单ID
   */
  const refreshPickupCode = useCallback(async (orderId: number) => {
    try {
      const res = await getPickupCode(orderId)
      setPickupCode(res.pickupCode)
      setPickupExpiresIn(res.expiresIn)
    } catch {
      // 拦截器已统一提示
    }
  }, [])

  // 确认支付阶段：启动支付倒计时
  useEffect(() => {
    if (phase !== 'confirm' || !lockResult) return
    // 计算初始倒计时：优先用过期时间计算，降级用 remainingTime
    const init = lockResult.expireAt
      ? Math.max(0, Math.ceil((new Date(lockResult.expireAt).getTime() - Date.now()) / 1000))
      : (lockResult.remainingTime ?? 0)
    setCountdownSeconds(init)

    // 每秒递减，到 0 时停止
    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) { clearInterval(countdownTimerRef.current); return 0 }
        return next
      })
    }, 1000)
    return () => { clearInterval(countdownTimerRef.current) }
  }, [phase, lockResult])

  // 支付成功阶段：启动取票码刷新倒计时
  useEffect(() => {
    if (phase !== 'success' || !payResult?.id) return
    // 首次获取取票码
    refreshPickupCode(payResult.id)
    // 每秒递减，到 0 时刷新取票码并重置倒计时
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

  /** 关闭弹窗 */
  const handleClose = () => {
    onClose()
  }

  // 弹窗标题：影院 · 影厅 · 日期 时间
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
        /* 加载中 */
        <div className="py-12 text-center"><Spin /></div>
      ) : phase === 'success' && payResult ? (
        /* 支付成功页面：展示取票码和订单详情 */
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
        /* 确认支付页面：展示订单信息和支付倒计时 */
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

          {/* 支付倒计时条 */}
          <div className="flex items-center justify-between rounded px-3 py-2 mb-3 border" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
            <span className="text-[13px]" style={{ color: 'var(--color-warning-text)' }}>支付倒计时</span>
            <span className={`font-mono text-base font-bold ${countdownSeconds > 0 && countdownSeconds <= 60 ? '' : ''}`} style={{ color: countdownSeconds > 0 && countdownSeconds <= 60 ? 'var(--color-warning-urgent)' : 'var(--color-warning-text)' }}>
              {String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:{String(countdownSeconds % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCancelOrder}>取消订单</Button>
            <Button type="primary" loading={submitting} onClick={handlePay} disabled={countdownSeconds <= 0} className="flex-1">
              {countdownSeconds <= 0 ? '订单已失效' : '立即支付'}
            </Button>
          </div>
        </div>
      ) : seatMap ? (
        /* 选座页面：展示座位图 */
        <div>
          {/* 银幕指示器 */}
          <div className="mx-auto mb-6 w-[70%] h-2 rounded-t-[50%] bg-accent/30" />
          <p className="text-center text-xs text-muted mb-4">银幕</p>

          {/* 座位网格 */}
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex flex-col gap-1.5 mx-auto min-w-full">
              {seatGrid.map((row) => (
                <div key={row.rowIndex} className="flex gap-1.5 justify-center items-center">
                  {/* 行号 */}
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
                      // 空位占位
                      <div key={colIdx} className="w-7 h-7 shrink-0" />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 座位图例 */}
          <div className="flex gap-4 justify-center mt-4 mb-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-surface border border-border" />可选</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-accent" />已选</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-code-bg" />已锁定</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3.5 h-3.5 rounded bg-danger/40" />已售</span>
          </div>

          {/* 已选座位 + 操作栏 */}
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
                {/* 票数和总价 */}
                <div className="text-sm">
                  <span className="text-muted">{selectedSeats.length} 张 · </span>
                  <span className="text-accent font-medium text-base">¥{totalPrice.toFixed(1)}</span>
                </div>
                {/* 锁座下单按钮 */}
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

/** 座位格子组件属性 */
interface SeatCellProps {
  /** 座位信息 */
  seat: SeatVO
  /** 是否已选中 */
  selected: boolean
  /** 点击回调 */
  onClick: () => void
}

/**
 * 单个座位格子组件。
 * 根据座位状态（可选/已售/已锁定/已选中）渲染不同样式。
 * @param seat 座位信息
 * @param selected 是否已选中
 * @param onClick 点击回调
 */
function SeatCell({ seat, selected, onClick }: SeatCellProps) {
  const base = 'w-7 h-7 rounded text-[10px] flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0 select-none'

  // 已选中状态
  if (selected) {
    return (
      <div className={`${base} bg-accent text-white`} onClick={onClick} title={seat.seatLabel}>
        {seat.colIndex}
      </div>
    )
  }

  // 已售状态（不可点击）
  if (seat.status === 'sold') {
    return (
      <div className={`${base} bg-danger/40 text-white/70 cursor-not-allowed`} title={`${seat.seatLabel}（已售）`}>
        {seat.colIndex}
      </div>
    )
  }

  // 已锁定状态（不可点击）
  if (seat.status === 'locked') {
    return (
      <div className={`${base} bg-code-bg text-muted cursor-not-allowed`} title={`${seat.seatLabel}（已锁定）`}>
        {seat.colIndex}
      </div>
    )
  }

  // 可选状态
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
