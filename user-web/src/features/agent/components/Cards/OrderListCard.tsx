import { useState } from 'react'
import { Button, Tag, Empty, Modal } from 'antd'
import type { BaseCardProps, OrderListCardData } from '../../types'

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
  { key: 'refunded', label: '已退票' },
] as const

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'warning' },
  paid: { label: '已出票', color: 'success' },
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

export default function OrderListCard({ data, onAction }: BaseCardProps<OrderListCardData>) {
  const { records, total } = data || {}
  const [activeFilter, setActiveFilter] = useState('')

  const filtered = activeFilter
    ? (records || []).filter((o) => o.status === activeFilter)
    : (records || [])

  const handleFilter = (key: string) => {
    setActiveFilter(key)
    const label = key ? FILTERS.find((f) => f.key === key)?.label : '全部'
    onAction(`显示${label}订单`)
  }

  const handleRefund = (orderNo: string) => {
    Modal.confirm({
      title: '确认退票',
      content: '确认退票？放映前可退，将释放座位。款项将原路返还。',
      okText: '确认退票',
      cancelText: '取消',
      onOk: () => {
        onAction(`退票${orderNo}`)
      },
    })
  }

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
          共{total ?? (records || []).length}条
        </span>
      </div>

      {/* 订单列表 */}
      <div style={S.list}>
        {filtered.length === 0 ? (
          <Empty description="暂无订单" />
        ) : (
          filtered.map((order) => {
            const st = STATUS_MAP[order.status] || STATUS_MAP.pending
            const isCancelled = order.status === 'cancelled'
            const isRefunded = order.status === 'refunded'

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
                {order.status === 'pending' && (
                  <div style={S.actions}>
                    <Button
                      type="primary"
                      style={{ flex: 1 }}
                      onClick={() => onAction(`支付订单${order.orderNo}`)}
                    >
                      去支付
                    </Button>
                    <Button
                      type="default"
                      style={{ flex: 1 }}
                      onClick={() => onAction(`取消订单${order.orderNo}`)}
                    >
                      取消订单
                    </Button>
                  </div>
                )}
                {order.status === 'paid' && (
                  <div style={S.actions}>
                    <Button
                      type="primary"
                      style={{ flex: 1 }}
                      onClick={() => onAction(`查看订单${order.orderNo}取票码`)}
                    >
                      查看取票码
                    </Button>
                    <Button
                      type="default"
                      danger
                      style={{ flex: 1 }}
                      onClick={() => handleRefund(order.orderNo)}
                    >
                      退票
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
