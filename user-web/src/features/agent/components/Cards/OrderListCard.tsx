import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Tag, Pagination, Empty, App, Spin, Modal, Descriptions } from 'antd'
import request from '@/shared/request'
import { payOrder, cancelOrder, refundOrder } from '@/features/order/api'
import type { BaseCardProps, OrderListCardData, OrderItem } from '../../types'

/** 订单状态筛选标签配置 */
const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已出票' },
  { key: 'checked', label: '已检票' },
  { key: 'refunded', label: '已退票' },
  { key: 'expired', label: '已过期' },
] as const

/** 订单状态 → 标签文本 + 颜色 映射表 */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'warning' },
  paid: { label: '已出票', color: 'success' },
  checked: { label: '已检票', color: 'processing' },
  cancelled: { label: '已取消', color: 'default' },
  refunded: { label: '已退票', color: 'error' },
  expired: { label: '已过期', color: 'default' },
}

/**
 * 格式化日期 + 时间为 "MM月DD日 HH:mm" 形式。
 * @param dateStr 日期字符串（YYYY-MM-DD）
 * @param timeStr 时间字符串（HH:mm）
 * @returns 格式化后的文本，如 "08月10日 14:30"
 */
function fmtDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return '-'
  const d = new Date(dateStr)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}月${day}日 ${timeStr}`
}

/**
 * 将剩余秒数格式化为 mm:ss。
 * @param totalSec 剩余秒数
 * @returns 如 "05:30"
 */
function fmtTime(totalSec: number) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * 过期倒计时子组件：每秒递减，到 0 自动消失。
 * 仅在待支付订单有 remainingSeconds 时渲染。
 * @param remainingSeconds 初始剩余秒数
 */
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

/** 每页显示的订单数量 */
const PAGE_SIZE = 5

/**
 * 订单列表卡片：查询并展示用户的历史订单，支持状态筛选、分页、支付/取消/退票/查看取票码。
 *
 * 功能：
 * - 顶部状态筛选标签栏（全部/待支付/已出票/已检票/已退票/已过期）
 * - 每条订单展示影片、影院、场次、座位、金额、订单号
 * - 待支付订单：支付倒计时 + 去支付 / 取消订单 按钮
 * - 已出票订单：查看取票码 / 退票 按钮
 * - 分页加载
 *
 * 对应后端接口：
 * - GET /orders（订单列表分页查询）
 * - GET /orders/{id}（订单详情，含取票码）
 * - GET /orders/{id}/pickup-code（获取取票码）
 * - POST /orders/{id}/pay（支付）
 * - POST /orders/{id}/cancel（取消）
 * - POST /orders/{id}/refund（退票）
 */
export default function OrderListCard({ data }: BaseCardProps<OrderListCardData>) {
  const { modal, message } = App.useApp()
  // 从 props 初始化分页数据
  const initFromProps = (d: OrderListCardData | undefined) => ({
    records: d?.records || [],
    total: d?.total || 0,
    page: d?.page || 1,
  })
  const [state, setState] = useState(() => initFromProps(data))
  const [activeFilter, setActiveFilter] = useState('')     // 当前激活的状态筛选
  const [loading, setLoading] = useState(false)             // 列表加载状态
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set()) // 本地已取消订单 ID 集合
  const [pickupModal, setPickupModal] = useState<{          // 取票码弹窗状态
    open: boolean; loading: boolean; orderId: number | null; data: Record<string, any> | null
  }>({ open: false, loading: false, orderId: null, data: null })
  const dataRef = useRef(data)  // 用于检测 props 变化

  // props 数据变化时重新初始化列表（如后端推送了新的订单列表卡片）
  useEffect(() => {
    if (data !== dataRef.current && data) {
      dataRef.current = data
      setState(initFromProps(data))
      setActiveFilter('')
      setCancelledIds(new Set())
    }
  }, [data])

  /** 按状态筛选并分页查询订单
   *  对应后端接口：GET /orders?status=&page=&size=
   */
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

  /** 切换筛选标签 */
  const handleFilter = (key: string) => {
    setActiveFilter(key)
    fetchPage(1, key)
  }

  /** 支付订单：调用 payOrder 接口后刷新列表 */
  const handlePay = useCallback(async (orderId: number) => {
    try {
      await payOrder(orderId)
      message.success('支付成功')
      fetchPage(state.page, activeFilter)
    } catch {
      // 拦截器已统一提示
    }
  }, [message, fetchPage, state.page, activeFilter])

  /** 取消订单：弹出确认弹窗，确认后调用 cancelOrder 接口 */
  const handleCancel = useCallback((orderId: number) => {
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: async () => {
        try {
          await cancelOrder(orderId)
          // 本地标记已取消，不重新拉取整个列表
          setCancelledIds((prev) => new Set(prev).add(orderId))
          message.success('订单已取消')
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }, [modal, message])

  /** 退票：弹出确认弹窗，确认后调用 refundOrder 接口并刷新列表 */
  const handleRefund = useCallback((orderId: number) => {
    modal.confirm({
      title: '确认退票',
      content: '确认退票？放映前可退，将释放座位。款项将原路返还。',
      okText: '确认退票',
      cancelText: '取消',
      onOk: async () => {
        try {
          await refundOrder(orderId)
          message.success('退票成功')
          fetchPage(state.page, activeFilter)
        } catch {
          // 拦截器已统一提示
        }
      },
    })
  }, [modal, message, fetchPage, state.page, activeFilter])

  /** 查看取票码：先查订单详情，若无取票码则请求获取接口 */
  const handleViewPickupCode = async (orderId: number) => {
    setPickupModal({ open: true, loading: true, orderId, data: null })
    try {
      // 先从订单详情获取取票码
      let res = await request.get(`/orders/${orderId}`)
      let detail: Record<string, any> = res.data as Record<string, any>
      // 若详情中没有取票码，再调用取票码接口获取
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
              // 本地取消的订单显示为 cancelled 状态
              const locallyCancelled = cancelledIds.has(order.id)
              const effectiveStatus = locallyCancelled ? 'cancelled' : order.status
              const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending
              const isCancelled = effectiveStatus === 'cancelled'
              const isRefunded = effectiveStatus === 'refunded'

              return (
                <div key={order.id} className={`overflow-hidden rounded-lg border border-border ${(isCancelled || isRefunded) ? 'opacity-60' : ''}`}>
                  {/* 影片名 + 状态标签 */}
                  <div className="flex items-center justify-between border-b border-border/30 px-3.5 py-2.5">
                    <span className="text-[15px] font-bold text-heading">🎬 {order.movieName}</span>
                    <Tag color={st.color} className="!rounded-full !m-0">
                      {st.label}
                    </Tag>
                  </div>

                  {/* 订单明细 */}
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

                  {/* 待支付订单：倒计时 + 支付/取消按钮 */}
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
                  {/* 已出票订单：查看取票码 / 退票按钮 */}
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

      {/* 分页（总数超过每页条数时显示） */}
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
              {/* 取票码展示区：点击复制 */}
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
              {/* 订单详情 */}
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