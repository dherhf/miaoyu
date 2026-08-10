import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, App } from 'antd'
import { payOrder, cancelOrder } from '@/features/order/api'
import type { BaseCardProps, PendingOrderCardData } from '../../types'

/**
 * 将剩余秒数格式化为 mm:ss 形式。
 * @param totalSec 剩余秒数
 * @returns 如 "05:30"
 */
function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * 待支付订单卡片：对话中出现历史待支付订单时提醒用户尽快支付。
 * 功能：
 * - 展示影片、影院、座位、金额
 * - 倒计时：剩余秒数归零后展示"订单已超时释放"
 * - "继续支付"按钮调用 payOrder 接口
 * - "放弃订单"按钮弹出确认后调用 cancelOrder 释放座位
 * - 支付成功 / 已取消 / 已超时分别展示对应遮罩
 *
 * 对应后端接口：POST /orders/{id}/pay（支付）、POST /orders/{id}/cancel（取消）
 */
export default function PendingOrderCard({ data }: BaseCardProps<PendingOrderCardData>) {
  const { message, modal } = App.useApp()
  const { id, movieName, cinemaName, seatInfo, totalAmount, remainingSeconds } = data || {}
  const [seconds, setSeconds] = useState(remainingSeconds ?? 0) // 倒计时剩余秒数
  const [paying, setPaying] = useState(false)       // 支付请求 loading
  const [paid, setPaid] = useState(false)            // 本地标记已支付
  const [cancelled, setCancelled] = useState(false)  // 本地标记已取消
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const expired = seconds <= 0        // 是否已超时
  const done = paid || cancelled      // 是否已完结（支付或取消）

  /** 继续支付：调用支付接口，成功后标记 paid */
  const handlePay = useCallback(async () => {
    if (expired || done || paying) return
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
  }, [expired, done, paying, id, message])

  /** 放弃订单：弹出确认弹窗，确认后调用取消接口释放座位 */
  const handleCancel = useCallback(() => {
    if (expired || done) return
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
  }, [expired, done, id, modal, message])

  // 倒计时定时器：每秒递减，到 0 时停止
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
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-surface">
      {/* 超时遮罩 */}
      {expired && !done && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/95">
          <div className="text-sm font-bold text-muted">订单已超时释放</div>
          <div className="mt-1 text-[13px] text-muted/70">请重新选座购票</div>
        </div>
      )}

      {/* 支付成功遮罩 */}
      {paid && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/95">
          <div className="mb-2 text-[40px]">✅</div>
          <div className="text-sm font-bold text-success-text">支付成功</div>
          <div className="mt-1 text-[13px] text-muted/70">祝您观影愉快</div>
        </div>
      )}

      {/* 已取消遮罩 */}
      {cancelled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/95">
          <div className="mb-2 text-[40px]">❌</div>
          <div className="text-sm font-bold text-muted">订单已取消</div>
          <div className="mt-1 text-[13px] text-muted/70">座位已释放</div>
        </div>
      )}

      {/* 待支付提醒头 */}
      <div className="flex items-center gap-2 border-b border-warning-border bg-warning-bg px-4 py-2">
        <span className="text-lg">⏰</span>
        <span className="text-sm font-bold text-warning-deep">您有一笔待支付的订单</span>
      </div>

      {/* 订单信息 */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 py-1">
          <span className="min-w-[32px] text-xs text-muted/70">影片</span>
          <span className="text-sm font-medium text-heading">🎬 {movieName}</span>
        </div>
        <div className="flex items-center gap-2 py-1">
          <span className="min-w-[32px] text-xs text-muted/70">影院</span>
          <span className="text-sm text-heading/80">{cinemaName}</span>
        </div>
        <div className="flex items-center gap-2 py-1">
          <span className="min-w-[32px] text-xs text-muted/70">座位</span>
          <span className="text-sm text-heading/80">{seatInfo}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
          <span className="text-sm text-muted">订单金额</span>
          <span className="text-xl font-bold text-price">¥{totalAmount}</span>
        </div>
      </div>

      {/* 剩余时间倒计时 */}
      <div className="flex items-center justify-between border-y border-danger-soft-border bg-danger-soft-bg px-4 py-1.5">
        <span className="text-[13px] font-medium text-danger-soft-text">剩余时间</span>
        <span className="font-mono text-base font-bold text-price">{fmtTime(seconds)}</span>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <Button type="primary" danger block disabled={expired || done} loading={paying} onClick={handlePay}>继续支付</Button>
        <Button type="default" block disabled={expired || done || paying} onClick={handleCancel}>放弃订单</Button>
      </div>
    </div>
  )
}