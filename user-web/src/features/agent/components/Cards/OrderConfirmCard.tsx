import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Tag, App } from 'antd'
import { payOrder, cancelOrder } from '@/features/order/api'
import type { BaseCardProps, OrderConfirmCardData } from '../../types'

function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function OrderConfirmCard({ data }: BaseCardProps<OrderConfirmCardData>) {
  const { modal, message } = App.useApp()
  const { id, status, movieName, cinemaName, hallName, showDate, startTime, seatInfo, ticketCount, totalAmount, orderNo, remainingTime, expireAt } = data || {}
  const calcInitial = () => {
    if (!expireAt) return remainingTime ?? 0
    const diff = Math.max(0, Math.ceil((new Date(expireAt).getTime() - Date.now()) / 1000))
    return diff
  }

  const [seconds, setSeconds] = useState(calcInitial)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const expired = seconds <= 0
  const urgent = seconds > 0 && seconds <= 60

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
      await payOrder(id)
      setPaid(true)
      if (timerRef.current) clearInterval(timerRef.current)
      message.success('支付成功')
    } catch {
      // 拦截器已统一提示
    } finally {
      setPaying(false)
    }
  }, [expired, cancelled, status, paying, id, message])

  const handleCancel = useCallback(() => {
    if (expired || cancelled) return
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: async () => {
        try {
          await cancelOrder(id)
          setCancelled(true)
          if (timerRef.current) clearInterval(timerRef.current)
          message.success('订单已取消')
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }, [expired, cancelled, id, modal, message])

  const isPaid = status === 'paid' || paid
  const isCancelled = status === 'cancelled' || cancelled
  const disabled = expired || cancelled || status !== 'pending'

  const fmtShowTime = showDate && startTime ? `${showDate} ${startTime}` : '-'

  if (isPaid) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border bg-surface">
        <div className="m-3 rounded-lg bg-success-bg px-4 py-3 text-center text-sm font-medium text-success-text">
          支付成功，祝您观影愉快！
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-surface">
      {expired && !isCancelled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-alt/90">
          <div className="mb-2 text-[40px]">⏰</div>
          <div className="text-base font-bold text-muted">订单已超时</div>
          <div className="mt-1 text-[13px] text-muted/70">请重新选座</div>
        </div>
      )}


      {isCancelled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-alt/90">
          <div className="mb-2 text-[40px]">❌</div>
          <div className="text-base font-bold text-muted">订单已取消</div>
          <div className="mt-1 text-[13px] text-muted/70">座位已释放</div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border/50 bg-card-header-bg px-4 py-2">
        <span className="font-mono text-xs text-muted/70">{orderNo}</span>
        <Tag color="warning" className="!rounded-full">待支付</Tag>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-white">
            🎬
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold text-[15px] text-heading">{movieName}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted/70">
              <span>{cinemaName}</span>
              <span>|</span>
              <span>{hallName}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-surface-alt px-3 py-2">
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>放映时间</span><span>{fmtShowTime}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>座位信息</span><span>{seatInfo}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>票数</span><span>{ticketCount}张</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
        <span className="text-sm text-muted">订单金额</span>
        <span className="text-2xl font-bold text-price">¥{totalAmount}</span>
      </div>

      {!expired && (
        <div className="flex items-center justify-between border-t border-warning-border bg-warning-bg px-4 py-1.5">
          <span className="text-[13px] text-warning-text">支付倒计时</span>
          <span className={`font-mono text-base font-bold ${urgent ? 'text-warning-urgent' : 'text-muted'}`}>
            {fmtTime(seconds)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
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
