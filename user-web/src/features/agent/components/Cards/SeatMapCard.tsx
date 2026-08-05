import { useState, useCallback, useMemo } from 'react'
import { Button, Tag } from 'antd'
import type { BaseCardProps, SeatMapCardData, Seat } from '../../types'

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; cursor: string }> = {
  available: { bg: '#e5e7eb', border: '#d1d5db', text: '#374151', cursor: 'pointer' },
  locked: { bg: '#f59e0b', border: '#d97706', text: '#fff', cursor: 'not-allowed' },
  sold: { bg: '#ef4444', border: '#dc2626', text: '#fff', cursor: 'not-allowed' },
  selected: { bg: '#3b82f6', border: '#2563eb', text: '#fff', cursor: 'pointer' },
}

const CAT_STYLES: Record<string, { ring: string; badge: string }> = {
  regular: { ring: 'none', badge: '' },
  vip: { ring: '2px solid #fbbf24', badge: 'V' },
  couple: { ring: '2px solid #f472b6', badge: '♥' },
  wheelchair: { ring: '2px solid #60a5fa', badge: '♿' },
}

const SEAT_SIZE = 36
const GAP = 6

export default function SeatMapCard({ data, onAction }: BaseCardProps<SeatMapCardData>) {
  const { seats = [], totalRows = 0, totalCols = 0, availableSeats = 0, price } = data || {}
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])

  // 快速查找 map
  const seatMap = useMemo(() => {
    const map = new Map<string, Seat>()
    seats.forEach((s) => {
      if (s.seatCategory !== undefined || s.status) {
        map.set(`${s.rowIndex}-${s.colIndex}`, s)
      }
    })
    return map
  }, [seats])

  // 根据 grid 构建 seat lookup
  const buildGrid = useMemo(() => {
    const grid: (Seat | null)[][] = []
    for (let r = 1; r <= totalRows; r++) {
      const row: (Seat | null)[] = []
      for (let c = 1; c <= totalCols; c++) {
        const key = `${r}-${c}`
        const seat = seatMap.get(key) || null
        row.push(seat)
      }
      grid.push(row)
    }
    return grid
  }, [totalRows, totalCols, seatMap])

  const isSelected = useCallback(
    (seat: Seat) => selectedSeats.some((s) => s.seatIndex === seat.seatIndex),
    [selectedSeats],
  )

  const handleClick = useCallback(
    (seat: Seat) => {
      if (seat.status !== 'available') return
      if (isSelected(seat)) {
        setSelectedSeats((prev) => prev.filter((s) => s.seatIndex !== seat.seatIndex))
      } else {
        setSelectedSeats((prev) => [...prev, seat])
      }
    },
    [isSelected],
  )

  const totalPrice = selectedSeats.reduce((sum) => sum + (price || 0), 0)

  return (
    <div style={{ width: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* 银幕 */}
      <div style={{ padding: '16px 16px 8px', textAlign: 'center' }}>
        <div style={{ width: '60%', margin: '0 auto', height: 6, background: 'linear-gradient(90deg, transparent, #d1d5db, transparent)', borderRadius: 3 }} />
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>银幕</div>
      </div>

      {/* 座位网格 */}
      <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: GAP, margin: '0 auto' }}>
          {buildGrid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: GAP, justifyContent: 'center' }}>
              {row.map((seat, ci) => {
                if (!seat) return <div key={ci} style={{ width: SEAT_SIZE, height: SEAT_SIZE }} />
                const sel = isSelected(seat)
                const status = sel ? 'selected' : seat.status
                const colors = STATUS_COLORS[status] || STATUS_COLORS.available
                const cat = CAT_STYLES[seat.seatCategory] || CAT_STYLES.regular
                const disabled = seat.status === 'locked' || seat.status === 'sold'
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleClick(seat)}
                    title={`${seat.seatLabel} ¥${price}`}
                    style={{
                      width: SEAT_SIZE, height: SEAT_SIZE,
                      borderRadius: 8, border: `2px solid ${colors.border}`,
                      background: colors.bg, color: colors.text,
                      fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      outline: cat.ring === 'none' ? undefined : cat.ring,
                      outlineOffset: -2,
                      position: 'relative',
                      opacity: disabled ? 0.7 : 1,
                      transition: 'all .15s',
                    }}
                  >
                    {seat.seatCategory !== 'regular' && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 16, height: 16, borderRadius: '50%',
                        fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                        backgroundColor: seat.seatCategory === 'vip' ? '#fbbf24' : seat.seatCategory === 'couple' ? '#f472b6' : '#60a5fa',
                      }}>
                        {cat.badge}
                      </span>
                    )}
                    {seat.seatLabel}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 已选座位汇总 */}
      {selectedSeats.length > 0 && (
        <div style={{ padding: '8px 16px', background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>已选：</span>
          {selectedSeats.map((s) => (
            <Tag key={s.seatIndex} color="blue" style={{ background: '#1677ff', color: '#fff', borderColor: '#1677ff' }}>{s.seatLabel} ¥{price}</Tag>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>合计：¥{totalPrice}</span>
        </div>
      )}

      {/* 统计 */}
      <div style={{ padding: '6px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
        <span>共 <b style={{ color: '#111' }}>{availableSeats}</b> 个可选座位</span>
        <span>已选 {selectedSeats.length} 个座位</span>
      </div>

      {/* 确认按钮 */}
      <div style={{ padding: 12 }}>
        <Button
          block
          type="primary"
          disabled={selectedSeats.length === 0}
          onClick={() => {
            if (selectedSeats.length === 0) return
            const labels = selectedSeats.map((s) => s.seatLabel).join(', ')
            onAction(`确认选座：${labels}，共${selectedSeats.length}张`)
          }}
        >
          {selectedSeats.length > 0
            ? `确认选座（${selectedSeats.length}张 ¥${totalPrice}）`
            : '请先选择座位'}
        </Button>
      </div>

      {/* 图例 */}
      <div style={{ padding: '8px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, fontSize: 12, color: '#6b7280' }}>
        {[
          { label: '可选', bg: '#e5e7eb', border: '#d1d5db' },
          { label: '已锁定', bg: '#f59e0b', border: '#d97706' },
          { label: '已售', bg: '#ef4444', border: '#dc2626' },
          { label: '已选', bg: '#3b82f6', border: '#2563eb' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: l.bg, border: `2px solid ${l.border}` }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
