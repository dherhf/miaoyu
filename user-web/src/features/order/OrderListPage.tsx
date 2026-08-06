import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { App, Button, Empty, Modal, Pagination, Popconfirm, Spin, Tag } from 'antd'
import { getOrderDetail, listOrders, payOrder, cancelOrder, refundOrder } from './api'
import type { OrderDetailVO, OrderVO } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退票', value: 'refunded' },
]

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: '待支付' },
  paid: { color: 'success', label: '已支付' },
  cancelled: { color: 'default', label: '已取消' },
  refunded: { color: 'default', label: '已退票' },
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
      {detail.pickupCode && <Row label="取票码" value={<span className="font-mono text-lg tracking-[2px]">{detail.pickupCode}</span>} />}
      {detail.cancelReason && <Row label="取消原因" value={detail.cancelReason} />}
    </div>
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
