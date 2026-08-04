import { useState } from 'react'
import type { BaseCardProps, OrderListCardData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%', background: '#fff', borderRadius: 12,
    border: '1px solid #e5e7eb', overflow: 'hidden',
  },
  filterBar: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6', overflowX: 'auto' as const,
  },
  filterTag: {
    padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  filterTagActive: {
    background: '#1677ff', color: '#fff', borderColor: '#1677ff',
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
  statusTag: {
    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
  },
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
  primaryBtn: {
    flex: 1, padding: '8px 12px', borderRadius: 8,
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: '#1677ff', color: '#fff',
  },
  dangerBtn: {
    flex: 1, padding: '8px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: '#fff', color: '#6b7280',
  },
  empty: {
    textAlign: 'center' as const, padding: '32px 16px', color: '#9ca3af', fontSize: 14,
  },
  modalOverlay: {
    position: 'fixed' as const, inset: 0, zIndex: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, background: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    background: '#fff', borderRadius: 12, padding: 20,
    maxWidth: 320, width: '100%',
  },
  modalTitle: { margin: '0 0 8px', fontSize: 16, fontWeight: 700 },
  modalText: { margin: '0 0 16px', fontSize: 14, color: '#6b7280' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  modalCancelBtn: {
    padding: '6px 16px', borderRadius: 8, border: 'none',
    background: '#f3f4f6', color: '#6b7280', fontSize: 14, cursor: 'pointer',
  },
  modalConfirmBtn: {
    padding: '6px 16px', borderRadius: 8, border: 'none',
    background: '#ef4444', color: '#fff', fontSize: 14, cursor: 'pointer',
  },
}

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已出票' },
  { key: 'refunded', label: '已退票' },
] as const

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending: { label: '待支付', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  paid: { label: '已出票', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  cancelled: { label: '已取消', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  refunded: { label: '已退票', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

function fmtDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return '-'
  const d = new Date(dateStr)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}月${day}日 ${timeStr}`
}

export default function OrderListCard({ data, onAction }: BaseCardProps<OrderListCardData>) {
  const { orders, total } = data || {}
  const [activeFilter, setActiveFilter] = useState('')
  const [refundTarget, setRefundTarget] = useState<{ id: number; orderNo: string } | null>(null)

  const filtered = activeFilter
    ? (orders || []).filter((o) => o.status === activeFilter)
    : (orders || [])

  const handleFilter = (key: string) => {
    setActiveFilter(key)
    const label = key ? FILTERS.find((f) => f.key === key)?.label : '全部'
    onAction(`显示${label}订单`)
  }

  const handleRefund = (id: number, orderNo: string) => {
    setRefundTarget({ id, orderNo })
  }

  const confirmRefund = () => {
    if (!refundTarget) return
    onAction(`退票${refundTarget.orderNo}`)
    setRefundTarget(null)
  }

  return (
    <div style={S.wrap}>
      {/* 筛选栏 */}
      <div style={S.filterBar}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            style={{
              ...S.filterTag,
              ...(activeFilter === f.key ? S.filterTagActive : {}),
            }}
            onClick={() => handleFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', lineHeight: '30px' }}>
          共{total ?? (orders || []).length}条
        </span>
      </div>

      {/* 订单列表 */}
      <div style={S.list}>
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div>暂无订单</div>
          </div>
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
                  <span style={{
                    ...S.statusTag,
                    background: st.bg,
                    color: st.color,
                    border: `1px solid ${st.border}`,
                  }}>
                    {st.label}
                  </span>
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
                    <button style={S.primaryBtn} onClick={() => onAction(`支付订单${order.orderNo}`)}>
                      去支付
                    </button>
                    <button style={S.dangerBtn} onClick={() => onAction(`取消订单${order.orderNo}`)}>
                      取消订单
                    </button>
                  </div>
                )}
                {order.status === 'paid' && (
                  <div style={S.actions}>
                    <button style={S.primaryBtn} onClick={() => onAction(`查看订单${order.orderNo}取票码`)}>
                      查看取票码
                    </button>
                    <button style={{ ...S.dangerBtn, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleRefund(order.id, order.orderNo)}>
                      退票
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 退票确认弹窗 */}
      {refundTarget && (
        <div style={S.modalOverlay} onClick={() => setRefundTarget(null)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalTitle}>确认退票</h3>
            <p style={S.modalText}>
              确认退票？放映前可退，将释放座位。款项将原路返还。
            </p>
            <div style={S.modalActions}>
              <button style={S.modalCancelBtn} onClick={() => setRefundTarget(null)}>
                取消
              </button>
              <button style={S.modalConfirmBtn} onClick={confirmRefund}>
                确认退票
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
