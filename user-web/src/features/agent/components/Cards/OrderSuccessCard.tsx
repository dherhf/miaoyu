import { Button, App } from 'antd'
import type { BaseCardProps, OrderSuccessCardData } from '../../types'

/** 条形码各竖条宽度数组（用于模拟条形码视觉） */
const BAR_WIDTHS = [2, 4, 2, 6, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4]

/**
 * 支付成功卡片：订单支付完成后展示取票码与订单详情。
 * 功能：
 * - 成功动画头部 + 取票码（点击复制）
 * - 订单详情（影片/影院/影厅/时间/座位/金额）
 * - 模拟条形码视觉
 * - 底部操作按钮：查看我的订单 / 继续购票（通过 onAction 发送对话消息）
 */
export default function OrderSuccessCard({ data, onAction }: BaseCardProps<OrderSuccessCardData>) {
  const { message } = App.useApp()
  const { pickupCode, movieName, cinemaName, cinemaAddress, hallName, showDate, startTime, seatInfo, totalAmount, orderNo } = data || {}

  // 取票码，后端未返回时使用默认占位
  const code = pickupCode || '888888'

  /** 复制取票码到剪贴板（兼容旧浏览器降级方案） */
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // 剪贴板 API 不可用时使用降级方案
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    message.success(`取票码 ${code} 已复制`)
  }

  /** 格式化放映时间为 "MM月DD日 HH:mm" */
  const fmtTime = () => {
    if (!showDate || !startTime) return '-'
    const d = new Date(showDate)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${m}月${day}日 ${startTime}`
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface">
      {/* 成功头部：动画图标 + 文案 */}
      <div className="bg-gradient-to-b from-success-bg to-surface px-4 pb-6 pt-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] shadow-[0_0_0_8px_rgba(74,222,128,0.15)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 12 10 17 19 7" />
          </svg>
        </div>
        <div className="mb-1 text-xl font-bold text-heading">支付成功！</div>
        <div className="text-sm text-muted/70">您的电影票已预订成功</div>
      </div>

      {/* 取票码区域：点击复制 */}
      <div className="border-b border-dashed border-border px-4 py-5 text-center">
        <div className="mb-2 text-[13px] text-muted/70">取票码</div>
        <div className="cursor-pointer select-all text-[36px] font-bold tracking-[4px] text-heading" onClick={copyCode}>{code}</div>
        <div className="mt-1 text-xs text-muted/70">长按或点击复制</div>
      </div>

      {/* 订单详情 */}
      <div className="p-4">
        <div className="rounded-lg bg-surface-alt p-3">
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>影片</span><span className="font-bold text-heading">{movieName}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>影院</span><span>{cinemaName}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>地址</span><span className="max-w-[180px] truncate">{cinemaAddress}</span></div>
          <div className="my-1.5 border-t border-border" />
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>影厅</span><span>{hallName}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>时间</span><span>{fmtTime()}</span></div>
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>座位</span><span>{seatInfo}</span></div>
          <div className="my-1.5 border-t border-border" />
          <div className="flex justify-between py-1 text-[13px] text-muted"><span>金额</span><span className="text-lg font-bold text-price">¥{totalAmount}</span></div>
        </div>
      </div>

      {/* 模拟条形码 */}
      <div className="bg-surface-alt px-4 py-3">
        <div className="flex h-10 items-end justify-center gap-px overflow-hidden">
          {BAR_WIDTHS.map((w, i) => (
            <div key={i} className="h-full rounded-sm bg-barcode" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-1 text-center font-mono text-[11px] tracking-[3px] text-muted/70">{orderNo}</div>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex flex-col gap-2 p-4">
        <Button type="primary" block onClick={() => onAction('查看我的订单')}>查看我的订单</Button>
        <Button type="default" block onClick={() => onAction('我想看其他电影')}>继续购票</Button>
      </div>
    </div>
  )
}