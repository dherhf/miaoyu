import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Tag, Pagination, Empty, App, Spin, Modal, Descriptions } from 'antd'
import request from '@/shared/request'
import type { BaseCardProps, OrderListCardData, OrderItem } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%', background: '#fff', borderRadius: 12,
    border: '1px solid #e5e7eb', overflow: 'hidden',
  },
  filterBar: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6', overflowX: 'auto' as const,
    alignItems: 'center',
  },
  list: {
    padding: '8px 12px', display: 'flex', flexDirection: 'column' as const, gap: 8,
    minHeight: 120, position: 'relative' as const,
  },
  orderItem: {
    border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
  },
  itemHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #f9fafb',
  },
  movieName: { fontWeight: 700, fontSize: 15, color: '#111' },
  itemBody: {
    padding: '8px 14px 12px',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '3px 0', fontSize: 13, color: '#6b7280',
  },
  amount: { fontWeight: 700, color: '#dc2626' },
  actions: {
    display: 'flex', gap: 8, padding: '8px 14px 12px',
  },
}

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已出票' },
  { key: 'checked', label: '已检票' },
  { key: 'refunded', label: '已退票' },
] as const

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'warning' },
  paid: { label: '已出票', color: 'success' },
  checked: { label: '已检票', color: 'processing' },
  cancelled: { label: '已取消', color: 'default' },
  refunded: { label: '已退票', color: 'error' },
}

function fmtDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return '-'
  const d = new Date(dateStr)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}月${day}日 ${timeStr}`
}

const PAGE_SIZE = 10

export default function OrderListCard({ data, onAction }: BaseCardProps<OrderListCardData>) {
  const { modal, message } = App.useApp()
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

  // 当 props.data 变化（新卡片推送）时同步
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

  const handleCancel = useCallback((orderId: number) => {
    modal.confirm({
      title: '取消订单',
      content: '确定放弃这些座位吗？取消后座位将被释放。',
      okText: '确认取消',
      cancelText: '关闭',
      onOk: () => {
        setCancelledIds((prev) => new Set(prev).add(orderId))
        onAction(`取消订单${orderId}`)
      },
    })
  }, [modal, onAction])

  const handleRefund = (orderId: number) => {
    modal.confirm({
      title: '确认退票',
      content: '确认退票？放映前可退，将释放座位。款项将原路返还。',
      okText: '确认退票',
      cancelText: '取消',
      onOk: () => {
        onAction(`退票${orderId}`)
      },
    })
  }

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
    <div style={S.wrap}>
      {/* 筛选栏 */}
      <div style={S.filterBar}>
        {FILTERS.map((f) => (
          <Tag
            key={f.key}
            color={activeFilter === f.key ? 'blue' : undefined}
            style={activeFilter === f.key
              ? { background: '#1677ff', color: '#fff', borderColor: '#1677ff', borderRadius: 999, cursor: 'pointer' }
              : { borderRadius: 999, cursor: 'pointer' }
            }
            onClick={() => handleFilter(f.key)}
          >
            {f.label}
          </Tag>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
          共{total}条
        </span>
      </div>

      {/* 订单列表 */}
      <Spin spinning={loading}>
        <div style={S.list}>
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
                <div key={order.id} style={{
                  ...S.orderItem,
                  opacity: (isCancelled || isRefunded) ? 0.6 : 1,
                }}>
                  {/* 头部：影片名 + 状态标签 */}
                  <div style={S.itemHeader}>
                    <span style={S.movieName}>🎬 {order.movieName}</span>
                    <Tag color={st.color} style={{ borderRadius: 999 }}>
                      {st.label}
                    </Tag>
                  </div>

                  {/* 详情 */}
                  <div style={S.itemBody}>
                    <div style={S.infoRow}>
                      <span>场次</span>
                      <span>{fmtDate(order.showDate, order.startTime)} | {order.cinemaName}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span>座位</span>
                      <span>{order.seatInfo}</span>
                    </div>
                    <div style={S.infoRow}>
                      <span>票数</span>
                      <span>{order.ticketCount}张</span>
                    </div>
                    <div style={S.infoRow}>
                      <span>金额</span>
                      <span style={isCancelled || isRefunded ? { color: '#9ca3af' } : S.amount}>
                        ¥{order.totalAmount}
                      </span>
                    </div>
                    <div style={{ ...S.infoRow, fontSize: 11, color: '#9ca3af' }}>
                      <span>订单号</span>
                      <span style={{ fontFamily: 'monospace' }}>{order.orderNo}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {order.status === 'pending' && !locallyCancelled && (
                    <div style={S.actions}>
                      <Button
                        type="primary"
                        style={{ flex: 1 }}
                        onClick={() => onAction(`支付订单${order.id}`)}
                      >
                        去支付
                      </Button>
                      <Button
                        type="default"
                        style={{ flex: 1 }}
                        disabled={locallyCancelled}
                        onClick={() => handleCancel(order.id)}
                      >
                        取消订单
                      </Button>
                    </div>
                  )}
                  {(order.status === 'paid' || order.status === 'checked') && (
                    <div style={S.actions}>
                      <Button
                        type="primary"
                        style={{ flex: 1 }}
                        onClick={() => handleViewPickupCode(order.id)}
                      >
                        查看取票码
                      </Button>
                      {order.status === 'paid' && (
                        <Button
                          type="default"
                          danger
                          style={{ flex: 1 }}
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
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
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
              <div style={{ textAlign: 'center', padding: '16px 0', background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>取票码</div>
                <div
                  style={{ fontSize: 40, fontWeight: 700, letterSpacing: 6, color: '#111', cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => {
                    const code = pickupModal.data?.pickupCode || ''
                    navigator.clipboard.writeText(code).catch(() => {})
                    message.success(`取票码 ${code} 已复制`)
                  }}
                >
                  {pickupModal.data.pickupCode || '-'}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>点击复制取票码</div>
              </div>
              <Descriptions column={1} size="small" colon={false}>
                <Descriptions.Item label="影片">{pickupModal.data.movieName}</Descriptions.Item>
                <Descriptions.Item label="影院">{pickupModal.data.cinemaName}</Descriptions.Item>
                <Descriptions.Item label="地址">{pickupModal.data.cinemaAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="影厅">{pickupModal.data.hallName}</Descriptions.Item>
                <Descriptions.Item label="时间">{pickupModal.data.showDate ? fmtDate(pickupModal.data.showDate, pickupModal.data.startTime) : '-'}</Descriptions.Item>
                <Descriptions.Item label="座位">{pickupModal.data.seatInfo}</Descriptions.Item>
                <Descriptions.Item label="订单号"><span style={{ fontFamily: 'monospace' }}>{pickupModal.data.orderNo}</span></Descriptions.Item>
              </Descriptions>
            </div>
          ) : null}
        </Spin>
      </Modal>
    </div>
  )
}
