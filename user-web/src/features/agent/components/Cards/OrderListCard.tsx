import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Tag, Pagination, Empty, Spin, Modal, Descriptions } from 'antd'
import { message, modal } from '@/shared/globalMessage'
import request from '@/shared/request'
import { payOrder, cancelOrder, refundOrder } from '@/features/order/api'
import type { BaseCardProps, OrderListCardData, OrderItem } from '../../types'

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已出票' },
  { key: 'checked', label: '已检票' },
  { key: 'refunded', label: '已退票' },
  { key: 'expired', label: '已过期' },
] as const

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'warning' },
  paid: { label: '已出票', color: 'success' },
  checked: { label: '已检票', color: 'processing' },
  cancelled: { label: '已取消', color: 'default' },
  refunded: { label: '已退票', color: 'error' },
  expired: { label: '已过期', color: 'default' },
}

function fmtDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return '-'
  const d = new Date(dateStr)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}月${day}日 ${timeStr}`
}

function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function ExpireCountdown({ remainingSeconds }: { remainingSeconds: number }) {
  const [seconds, setSeconds] = useState(remainingSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const expired = seconds <= 0

  useEffect(() => {
    if (expired) return
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) { clearInterval(timerRef.current); return 0 }
        return next
      })
    }, 1000)
    return () => { clearInterval(timerRef.current) }
  }, [expired])

  if (expired) return null
  return (
    <div className="flex items-center justify-between border-t border-warning-border bg-warning-bg px-3.5 py-1.5">
      <span className="text-[13px] text-warning-text">支付倒计时</span>
      <span className="font-mono text-base font-bold text-warning-text">{fmtTime(seconds)}</span>
    </div>
  )
}

const PAGE_SIZE = 5

export default function OrderListCard({ data }: BaseCardProps<OrderListCardData>) {
  const initFromProps = (d: OrderListCardData | undefined) => ({
    records: d?.records || [],
    total: d?.total || 0,
    page: d?.page || 1,
  })
  const [state, setState] = useState(() => initFromProps(data))
  const [activeFilter, setActiveFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set())
  const [pickupModal, setPickupModal] = useState<{
    open: boolean; loading: boolean; orderId: number | null; data: Record<string, any> | null
  }>({ open: false, loading: false, orderId: null, data: null })
  const dataRef = useRef(data)
  const payRequestIds = useRef<Map<number, string>>(new Map())
  const cancelRequestIds = useRef<Map<number, string>>(new Map())
  const refundRequestIds = useRef<Map<number, string>>(new Map())

  useEffect(() => {
    if (data !== dataRef.current && data) {
      dataRef.current = data
      setState(initFromProps(data))
      setActiveFilter('')
      setCancelledIds(new Set())
    }
  }, [data])

  const fetchPage = useCallback(async (page: number, status: string) => {
    setLoading(true)
    try {
      const res = await request.get('/orders', {
        params: { status: status || undefined, page, size: PAGE_SIZE },
      })
      setState(res.data as { records: OrderItem[]; total: number; page: number; size: number })
    } catch {
      // 错误由拦截器统一提示
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFilter = (key: string) => {
    setActiveFilter(key)
    fetchPage(1, key)
  }

  const handlePay = useCallback(async (orderId: number) => {
    try {
      let rid = payRequestIds.current.get(orderId)
      if (!rid) { rid = crypto.randomUUID(); payRequestIds.current.set(orderId, rid) }
      await payOrder(orderId, rid)
      payRequestIds.current.delete(orderId)
      message.success('支付成功')
      fetchPage(state.page, activeFilter)
    } catch {
      // 拦截器已统一提示
    }
  }, [message, fetchPage, state.page, activeFilter])

  const handleCancel = useCallback((orderId: number) => {
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: async () => {
        try {
          let rid = cancelRequestIds.current.get(orderId)
          if (!rid) { rid = crypto.randomUUID(); cancelRequestIds.current.set(orderId, rid) }
          await cancelOrder(orderId, rid)
          cancelRequestIds.current.delete(orderId)
          setCancelledIds((prev) => new Set(prev).add(orderId))
          message.success('订单已取消')
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }, [modal, message])

  const handleRefund = useCallback((orderId: number) => {
    modal.confirm({
      title: '确认退票',
      content: '确认退票？放映前可退，将释放座位。款项将原路返还。',
      okText: '确认退票',
      cancelText: '取消',
      onOk: async () => {
        try {
          let rid = refundRequestIds.current.get(orderId)
          if (!rid) { rid = crypto.randomUUID(); refundRequestIds.current.set(orderId, rid) }
          await refundOrder(orderId, rid)
          refundRequestIds.current.delete(orderId)
          message.success('退票成功')
          fetchPage(state.page, activeFilter)
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }, [modal, message, fetchPage, state.page, activeFilter])

  const handleViewPickupCode = async (orderId: number) => {
    setPickupModal({ open: true, loading: true, orderId, data: null })
    try {
      let res = await request.get(`/orders/${orderId}`)
      let detail: Record<string, any> = res.data as Record<string, any>
      if (!detail.pickupCode) {
        const codeRes = await request.get(`/orders/${orderId}/pickup-code`)
        detail = { ...detail, pickupCode: (codeRes.data as any)?.pickupCode }
      }
      setPickupModal({ open: true, loading: false, orderId, data: detail })
    } catch {
      setPickupModal({ open: false, loading: false, orderId: null, data: null })
    }
  }

  const { records, total, page } = state

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface">
      {/* 筛选栏 */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/50 px-4 py-3">
        {FILTERS.map((f) => (
          <Tag
            key={f.key}
            color={activeFilter === f.key ? 'blue' : undefined}
            className={`!cursor-pointer !rounded-full ${activeFilter === f.key ? '!border-[#1677ff] !bg-[#1677ff] !text-white' : '!text-muted !border-border !bg-transparent'}`}
            onClick={() => handleFilter(f.key)}
          >
            {f.label}
          </Tag>
        ))}
        <span className="ml-auto whitespace-nowrap text-xs text-muted/70">
          共{total}条
        </span>
      </div>

      {/* 订单列表 */}
      <Spin spinning={loading}>
        <div className="flex min-h-[120px] flex-col gap-2 px-3 py-2">
          {records.length === 0 ? (
            <Empty description="暂无订单" />
          ) : (
            records.map((order) => {
              const locallyCancelled = cancelledIds.has(order.id)
              const effectiveStatus = locallyCancelled ? 'cancelled' : order.status
              const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending
              const isCancelled = effectiveStatus === 'cancelled'
              const isRefunded = effectiveStatus === 'refunded'

              return (
                <div key={order.id} className={`overflow-hidden rounded-lg border border-border ${(isCancelled || isRefunded) ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between border-b border-border/30 px-3.5 py-2.5">
                    <span className="text-[15px] font-bold text-heading">🎬 {order.movieName}</span>
                    <Tag color={st.color} className="!rounded-full !m-0">
                      {st.label}
                    </Tag>
                  </div>

                  <div className="px-3.5 pt-2 pb-3">
                    <div className="flex justify-between py-0.5 text-[13px] text-muted">
                      <span>场次</span>
                      <span>{fmtDate(order.showDate, order.startTime)} | {order.cinemaName}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[13px] text-muted">
                      <span>座位</span>
                      <span>{order.seatInfo}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[13px] text-muted">
                      <span>票数</span>
                      <span>{order.ticketCount}张</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[13px] text-muted">
                      <span>金额</span>
                      <span className={isCancelled || isRefunded ? 'text-muted/70' : 'font-bold text-price'}>
                        ¥{order.totalAmount}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[11px] text-muted/70">
                      <span>订单号</span>
                      <span className="font-mono">{order.orderNo}</span>
                    </div>
                  </div>

                  {order.status === 'pending' && !locallyCancelled && order.remainingSeconds != null && order.remainingSeconds > 0 && (
                    <ExpireCountdown remainingSeconds={order.remainingSeconds} />
                  )}
                  {order.status === 'pending' && !locallyCancelled && (
                    <div className="flex gap-2 px-3.5 pt-0 pb-3">
                      <Button
                        type="primary"
                        className="flex-1"
                        onClick={() => handlePay(order.id)}
                      >
                        去支付
                      </Button>
                      <Button
                        type="default"
                        className="flex-1"
                        disabled={locallyCancelled}
                        onClick={() => handleCancel(order.id)}
                      >
                        取消订单
                      </Button>
                    </div>
                  )}
                  {order.status === 'paid' && (
                    <div className="flex gap-2 px-3.5 pt-0 pb-3">
                      <Button
                        type="primary"
                        className="flex-1"
                        onClick={() => handleViewPickupCode(order.id)}
                      >
                        查看取票码
                      </Button>
                      {order.status === 'paid' && (
                        <Button
                          type="default"
                          danger
                          className="flex-1"
                          onClick={() => handleRefund(order.id)}
                        >
                          退票
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Spin>

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div className="flex justify-center border-t border-border/50 px-4 py-2.5">
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            size="small"
            showSizeChanger={false}
            onChange={(p) => fetchPage(p, activeFilter)}
          />
        </div>
      )}

      {/* 取票码弹窗 */}
      <Modal
        title="取票码"
        open={pickupModal.open}
        onCancel={() => setPickupModal({ open: false, loading: false, orderId: null, data: null })}
        footer={null}
        destroyOnClose
      >
        <Spin spinning={pickupModal.loading}>
          {pickupModal.data ? (
            <div>
              <div className="mb-4 rounded-lg bg-surface-alt px-4 py-4 text-center">
                <div className="mb-1 text-xs text-muted/70">取票码</div>
                <div
                  className="cursor-pointer select-all text-[40px] font-bold tracking-[6px] text-heading"
                  onClick={() => {
                    const code = pickupModal.data?.pickupCode || ''
                    navigator.clipboard.writeText(code).catch(() => {})
                    message.success(`取票码 ${code} 已复制`)
                  }}
                >
                  {pickupModal.data.pickupCode || '-'}
                </div>
                <div className="mt-1 text-xs text-muted/70">点击复制取票码</div>
              </div>
              <Descriptions column={1} size="small" colon={false}>
                <Descriptions.Item label="影片">{pickupModal.data.movieName}</Descriptions.Item>
                <Descriptions.Item label="影院">{pickupModal.data.cinemaName}</Descriptions.Item>
                <Descriptions.Item label="地址">{pickupModal.data.cinemaAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="影厅">{pickupModal.data.hallName}</Descriptions.Item>
                <Descriptions.Item label="时间">{pickupModal.data.showDate ? fmtDate(pickupModal.data.showDate, pickupModal.data.startTime) : '-'}</Descriptions.Item>
                <Descriptions.Item label="座位">{pickupModal.data.seatInfo}</Descriptions.Item>
                <Descriptions.Item label="订单号"><span className="font-mono">{pickupModal.data.orderNo}</span></Descriptions.Item>
              </Descriptions>
            </div>
          ) : null}
        </Spin>
      </Modal>
    </div>
  )
}
