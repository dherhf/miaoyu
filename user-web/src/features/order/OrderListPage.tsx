import { useEffect, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { App, Button, Empty, Modal, Pagination, Popconfirm, Spin, Tag } from 'antd'
import { getOrderDetail, listOrders, payOrder, cancelOrder, refundOrder, getPickupCode } from './api'
import type { OrderDetailVO, OrderVO } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'

/** 每页条数 */
const PAGE_SIZE = 5

/** 订单状态筛选选项 */
const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退票', value: 'refunded' },
  { label: '已检票', value: 'checked' },
  { label: '已过期', value: 'expired' },
]

/** 订单状态标签映射：颜色 + 中文标签 */
const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: '待支付' },
  paid: { color: 'success', label: '已支付' },
  cancelled: { color: 'default', label: '已取消' },
  refunded: { color: 'default', label: '已退票' },
  checked: { color: 'processing', label: '已检票' },
  expired: { color: 'default', label: '已过期' },
}

/**
 * 订单列表页组件。
 * 展示用户的购票订单列表，支持按状态筛选和分页。
 * 每个订单卡片显示影片、影院、场次、座位、金额等信息。
 * 根据订单状态提供不同操作：待支付（取消/支付）、已支付（退票）、查看详情。
 * 订单详情弹窗中展示完整信息，已支付订单可查看取票码。
 */
export default function OrderListPage() {
  const { message } = App.useApp()
  // 订单列表
  const [orders, setOrders] = useState<OrderVO[]>([])
  // 总记录数（用于分页）
  const [total, setTotal] = useState(0)
  // 当前筛选的状态
  const [status, setStatus] = useState('')
  // 当前页码
  const [page, setPage] = useState(1)
  // 列表加载状态
  const [loading, setLoading] = useState(true)
  // 订单详情数据
  const [detail, setDetail] = useState<OrderDetailVO | null>(null)
  // 详情加载状态
  const [detailLoading, setDetailLoading] = useState(false)
  // 详情弹窗是否打开
  const [detailOpen, setDetailOpen] = useState(false)

  // 配置 Header 显示返回按钮，返回首页
  useHeaderBack(true, '/')

  // 状态或页码变化时重新加载订单列表
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

  /**
   * 打开订单详情弹窗。
   * @param id 订单ID
   */
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

  /**
   * 支付订单。
   * 支付成功后打开订单详情查看取票码。
   * @param order 订单信息
   */
  const handlePay = async (order: OrderVO) => {
    try {
      await payOrder(order.id)
      message.success('支付成功')
      await handleOpenDetail(order.id)
    } catch {
      // 拦截器已统一提示
    }
  }

  /**
   * 取消订单。
   * 取消成功后刷新当前页列表。
   * @param order 订单信息
   */
  const handleCancel = async (order: OrderVO) => {
    try {
      await cancelOrder(order.id)
      message.success('订单已取消')
      refreshCurrentPage()
    } catch {
      // 拦截器已统一提示
    }
  }

  /**
   * 退票（退款）。
   * 退票成功后刷新当前页列表。
   * @param order 订单信息
   */
  const handleRefund = async (order: OrderVO) => {
    try {
      await refundOrder(order.id)
      message.success('退票成功')
      refreshCurrentPage()
    } catch {
      // 拦截器已统一提示
    }
  }

  /** 刷新当前页订单列表（操作后调用） */
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
      {/* 状态筛选标签 */}
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

      {/* 订单列表区域 */}
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
          {/* 分页器 */}
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

      {/* 订单详情弹窗 */}
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

/** 订单卡片组件属性 */
interface OrderCardProps {
  /** 订单信息 */
  order: OrderVO
  /** 支付回调 */
  onPay: () => void
  /** 取消订单回调 */
  onCancel: () => void
  /** 退票回调 */
  onRefund: () => void
  /** 查看详情回调 */
  onDetail: () => void
}

/**
 * 订单卡片组件。
 * 展示单个订单的摘要信息，根据订单状态显示不同的操作按钮。
 * 待支付订单显示支付倒计时。
 */
function OrderCard({ order, onPay, onCancel, onRefund, onDetail }: OrderCardProps) {
  // 获取状态标签配置
  const st = STATUS_TAG[order.status] || { color: 'default', label: order.status }
  const isPending = order.status === 'pending'
  const isPaid = order.status === 'paid'
  // 是否显示支付倒计时（待支付且有剩余时间）
  const showCountdown = isPending && order.remainingSeconds != null && order.remainingSeconds > 0

  return (
    <div className="rounded-xl bg-surface-alt border border-border p-4">
      {/* 影片名称 + 状态标签 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[15px] font-medium text-heading truncate">
          {order.movieName}
        </span>
        <Tag color={st.color} className="shrink-0 m-0">{st.label}</Tag>
      </div>
      {/* 订单摘要信息 */}
      <div className="text-[13px] text-muted leading-[1.7]">
        <div className="truncate">{order.cinemaName} · {order.hallName}</div>
        <div>{order.showDate} {String(order.startTime).slice(0, 5)}</div>
        <div className="truncate">{order.seatInfo}</div>
        <div>
          {order.ticketCount}张 · <span className="text-rating font-medium">¥{Number(order.totalAmount).toFixed(1)}</span>
        </div>
      </div>

      {/* 待支付订单的倒计时条 */}
      {showCountdown && (
        <CountdownBar remainingSeconds={order.remainingSeconds!} />
      )}

      {/* 操作按钮区 */}
      <div className="flex justify-end gap-2 mt-3">
        {/* 待支付：取消 + 支付 */}
        {isPending && (
          <>
            <Popconfirm title="确定取消此订单?" okText="取消订单" cancelText="再想想" onConfirm={onCancel}>
              <Button size="small">取消</Button>
            </Popconfirm>
            <Button size="small" type="primary" onClick={onPay}>支付</Button>
          </>
        )}
        {/* 已支付：退票 */}
        {isPaid && (
          <Popconfirm title="确定退票?" okText="退票" cancelText="再想想" onConfirm={onRefund}>
            <Button size="small">退票</Button>
          </Popconfirm>
        )}
        {/* 详情按钮（所有状态都有） */}
        <Button size="small" onClick={onDetail}>详情</Button>
      </div>
    </div>
  )
}

/** 支付倒计时条组件属性 */
interface CountdownBarProps {
  /** 剩余秒数 */
  remainingSeconds: number
}

/**
 * 支付倒计时条组件。
 * 显示剩余支付时间，每秒递减，到 0 时自动隐藏。
 * @param remainingSeconds 初始剩余秒数
 */
function CountdownBar({ remainingSeconds }: CountdownBarProps) {
  const [seconds, setSeconds] = useState(remainingSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const expired = seconds <= 0

  useEffect(() => {
    if (expired) return
    // 每秒递减，到 0 时停止定时器
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) { clearInterval(timerRef.current); return 0 }
        return next
      })
    }, 1000)
    return () => { clearInterval(timerRef.current) }
  }, [expired])

  // 已过期则不渲染
  if (expired) return null

  // 格式化为 MM:SS
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center justify-between mt-2.5 rounded px-3 py-1.5 border" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
      <span className="text-[13px]" style={{ color: 'var(--color-warning-text)' }}>支付倒计时</span>
      <span className="font-mono text-base font-bold" style={{ color: 'var(--color-warning-text)' }}>{m}:{s}</span>
    </div>
  )
}

/** 订单详情信息组件属性 */
interface OrderDetailInfoProps {
  /** 订单详情数据 */
  detail: OrderDetailVO
}

/**
 * 订单详情信息组件。
 * 展示订单的完整信息，包括订单号、影片、影院、场次、座位、金额、状态等。
 * 已支付订单显示取票码（带刷新倒计时）。
 * 已检票订单显示检票时间。
 * 已取消订单显示取消原因。
 */
function OrderDetailInfo({ detail }: OrderDetailInfoProps) {
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
      {/* 已支付订单显示取票码 */}
      {detail.status === 'paid' && <PickupCodeDisplay orderId={detail.id} />}
      {/* 已检票订单显示检票时间 */}
      {detail.status === 'checked' && detail.checkedAt && (
        <Row label="检票时间" value={detail.checkedAt} />
      )}
      {/* 有取消原因时显示 */}
      {detail.cancelReason && <Row label="取消原因" value={detail.cancelReason} />}
    </div>
  )
}

/** 取票码展示组件属性 */
interface PickupCodeDisplayProps {
  /** 订单ID */
  orderId: number
}

/**
 * 取票码展示组件。
 * 获取并展示取票码，取票码有过期时间，到期后自动刷新。
 * 如果返回 409 状态码（已检票），则显示"已检票"。
 * @param orderId 订单ID
 */
function PickupCodeDisplay({ orderId }: PickupCodeDisplayProps) {
  // 取票码
  const [code, setCode] = useState<string | null>(null)
  // 取票码有效期剩余秒数
  const [expiresIn, setExpiresIn] = useState(60)
  // 是否已过期（已检票）
  const [expired, setExpired] = useState(false)
  // 刷新倒计时定时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 获取取票码 */
  const fetchCode = useCallback(async () => {
    try {
      const res = await getPickupCode(orderId)
      setCode(res.pickupCode)
      setExpiresIn(res.expiresIn)
      setExpired(false)
    } catch (err: unknown) {
      // 409 表示已检票，取票码不可用
      const code = (err as { code?: number }).code
      if (code === 409) {
        setExpired(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [orderId])

  // 组件挂载时获取取票码，卸载时清理定时器
  useEffect(() => {
    fetchCode()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchCode])

  // 启动取票码刷新倒计时
  useEffect(() => {
    if (expiresIn <= 0 || expired) return
    timerRef.current = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          // 到期后自动刷新取票码
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

  // 已检票状态
  if (expired) {
    return <Row label="取票码" value={<span className="text-muted">已检票</span>} />
  }

  return (
    <Row
      label="取票码"
      value={
        code ? (
          <span className="flex items-center gap-2">
            {/* 取票码（等宽字体 + 字间距） */}
            <span className="font-mono text-lg tracking-[2px]">{code}</span>
            {/* 刷新倒计时 */}
            <span className="text-xs text-muted">{expiresIn}s</span>
          </span>
        ) : (
          <Spin size="small" />
        )
      }
    />
  )
}

/** 信息行组件属性 */
interface RowProps {
  /** 标签 */
  label: string
  /** 值（可为文本或 ReactNode） */
  value: ReactNode
}

/**
 * 信息行组件。
 * 左右布局展示标签和值，用于订单详情中的每一行信息。
 */
function Row({ label, value }: RowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  )
}
