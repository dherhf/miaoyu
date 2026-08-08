import { useEffect, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { App, Button, Empty, Modal, Pagination, Popconfirm, Spin, Tag } from 'antd'
import { getOrderDetail, listOrders, payOrder, cancelOrder, refundOrder, getPickupCode } from './api'
import type { OrderDetailVO, OrderVO } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

const PAGE_SIZE = 5

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退票', value: 'refunded' },
  { label: '已检票', value: 'checked' },
  { label: '已过期', value: 'expired' },
]

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: '待支付' },
  paid: { color: 'success', label: '已支付' },
  cancelled: { color: 'default', label: '已取消' },
  refunded: { color: 'default', label: '已退票' },
  checked: { color: 'processing', label: '已检票' },
  expired: { color: 'default', label: '已过期' },
}

export default function OrderListPage() {
  const { message } = App.useApp()
  const [orders, setOrders] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<OrderDetailVO | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  useHeaderBack(true, '/')

  useEffect(() => {
    setLoading(true)
    listOrders({ status: status || undefined, page, size: PAGE_SIZE })
      .then((res) => {
        setOrders(res.records)
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status, page])

  const handleOpenDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await getOrderDetail(id)
      setDetail(res)
    } catch {
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePay = async (order: OrderVO) => {
    try {
      await payOrder(order.id)
      message.success('支付成功')
      await handleOpenDetail(order.id)
    } catch {
      // 拦截器已统一提示
    }
  }

  const handleCancel = async (order: OrderVO) => {
    try {
      await cancelOrder(order.id)
      message.success('订单已取消')
      refreshCurrentPage()
    } catch {
      // 拦截器已统一提示
    }
  }

  const handleRefund = async (order: OrderVO) => {
    try {
      await refundOrder(order.id)
      message.success('退票成功')
      refreshCurrentPage()
    } catch {
      // 拦截器已统一提示
    }
  }

  const refreshCurrentPage = () => {
    setLoading(true)
    listOrders({ status: status || undefined, page, size: PAGE_SIZE })
      .then((res) => {
        setOrders(res.records)
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="flex gap-1.5 flex-wrap mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <Tag.CheckableTag
            key={opt.value}
            checked={status === opt.value}
            onChange={() => {
              setPage(1)
              setStatus(opt.value)
            }}
          >
            {opt.label}
          </Tag.CheckableTag>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center"><Spin /></div>
      ) : orders.length === 0 ? (
        <Empty description="暂无订单" className="py-12" />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPay={() => handlePay(order)}
              onCancel={() => handleCancel(order)}
              onRefund={() => handleRefund(order)}
              onDetail={() => handleOpenDetail(order.id)}
            />
          ))}
          <div className="flex justify-center py-3">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              hideOnSinglePage
              showSizeChanger={false}
            />
          </div>
        </div>
      )}

      <Modal
        title="订单详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
      >
        {detailLoading || !detail ? (
          <div className="py-8 text-center"><Spin /></div>
        ) : (
          <OrderDetailInfo detail={detail} />
        )}
      </Modal>
    </div>
  )
}

function OrderCard({
  order,
  onPay,
  onCancel,
  onRefund,
  onDetail,
}: {
  order: OrderVO
  onPay: () => void
  onCancel: () => void
  onRefund: () => void
  onDetail: () => void
}) {
  const st = STATUS_TAG[order.status] || { color: 'default', label: order.status }
  const isPending = order.status === 'pending'
  const isPaid = order.status === 'paid'
  const showCountdown = isPending && order.remainingSeconds != null && order.remainingSeconds > 0

  return (
    <div className="rounded-xl bg-surface-alt border border-border p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[15px] font-medium text-heading truncate">
          {order.movieName}
        </span>
        <Tag color={st.color} className="shrink-0 m-0">{st.label}</Tag>
      </div>
      <div className="text-[13px] text-muted leading-[1.7]">
        <div className="truncate">{order.cinemaName} · {order.hallName}</div>
        <div>{order.showDate} {String(order.startTime).slice(0, 5)}</div>
        <div className="truncate">{order.seatInfo}</div>
        <div>
          {order.ticketCount}张 · <span className="text-rating font-medium">¥{Number(order.totalAmount).toFixed(1)}</span>
        </div>
      </div>

      {showCountdown && (
        <CountdownBar remainingSeconds={order.remainingSeconds!} />
      )}

      <div className="flex justify-end gap-2 mt-3">
        {isPending && (
          <>
            <Popconfirm title="确定取消此订单?" okText="取消订单" cancelText="再想想" onConfirm={onCancel}>
              <Button size="small">取消</Button>
            </Popconfirm>
            <Button size="small" type="primary" onClick={onPay}>支付</Button>
          </>
        )}
        {isPaid && (
          <Popconfirm title="确定退票?" okText="退票" cancelText="再想想" onConfirm={onRefund}>
            <Button size="small">退票</Button>
          </Popconfirm>
        )}
        <Button size="small" onClick={onDetail}>详情</Button>
      </div>
    </div>
  )
}

function CountdownBar({ remainingSeconds }: { remainingSeconds: number }) {
  const [seconds, setSeconds] = useState(remainingSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
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

  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center justify-between mt-2.5 rounded bg-[#fffbeb] px-3 py-1.5 border border-[#fde68a]">
      <span className="text-[13px] text-[#b45309]">支付倒计时</span>
      <span className="font-mono text-base font-bold text-[#b45309]">{m}:{s}</span>
    </div>
  )
}

function OrderDetailInfo({ detail }: { detail: OrderDetailVO }) {
  const st = STATUS_TAG[detail.status] || { color: 'default', label: detail.status }
  return (
    <div className="flex flex-col gap-2 text-[14px]">
      <Row label="订单号" value={detail.orderNo} />
      <Row label="影片" value={detail.movieName} />
      <Row label="影院" value={`${detail.cinemaName} · ${detail.hallName}`} />
      <Row label="场次" value={`${detail.showDate} ${String(detail.startTime).slice(0, 5)}`} />
      <Row label="座位" value={detail.seatInfo} />
      <Row label="数量" value={`${detail.ticketCount}张`} />
      <Row label="金额" value={`¥${Number(detail.totalAmount).toFixed(1)}`} />
      <Row label="状态" value={<Tag color={st.color} className="m-0">{st.label}</Tag>} />
      {detail.status === 'paid' && <PickupCodeDisplay orderId={detail.id} />}
      {detail.status === 'checked' && detail.checkedAt && (
        <Row label="检票时间" value={detail.checkedAt} />
      )}
      {detail.cancelReason && <Row label="取消原因" value={detail.cancelReason} />}
    </div>
  )
}

function PickupCodeDisplay({ orderId }: { orderId: number }) {
  const [code, setCode] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState(60)
  const [expired, setExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCode = useCallback(async () => {
    try {
      const res = await getPickupCode(orderId)
      setCode(res.pickupCode)
      setExpiresIn(res.expiresIn)
      setExpired(false)
    } catch (err: unknown) {
      const code = (err as { code?: number }).code
      if (code === 409) {
        setExpired(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [orderId])

  useEffect(() => {
    fetchCode()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchCode])

  useEffect(() => {
    if (expiresIn <= 0 || expired) return
    timerRef.current = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          fetchCode()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [expiresIn, expired, fetchCode])

  if (expired) {
    return <Row label="取票码" value={<span className="text-muted">已检票</span>} />
  }

  return (
    <Row
      label="取票码"
      value={
        code ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-lg tracking-[2px]">{code}</span>
            <span className="text-xs text-muted">{expiresIn}s</span>
          </span>
        ) : (
          <Spin size="small" />
        )
      }
    />
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  )
}
