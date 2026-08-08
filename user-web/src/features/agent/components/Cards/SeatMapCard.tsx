import { useState, useCallback, useMemo } from 'react'
import { Button, Tag, message } from 'antd'
import type { BaseCardProps, SeatMapCardData, Seat } from '../../types'

const STATUS_CLASSES: Record<string, string> = {
  available: 'bg-gray-200 border-gray-300 text-gray-700 cursor-pointer',
  locked: 'bg-amber-500 border-amber-600 text-white cursor-not-allowed',
  sold: 'bg-red-500 border-red-600 text-white cursor-not-allowed',
  selected: 'bg-blue-500 border-blue-600 text-white cursor-pointer',
}

const LEGEND_ITEMS = [
  { label: '可选', bg: 'bg-gray-200', border: 'border-gray-300' },
  { label: '已锁定', bg: 'bg-amber-500', border: 'border-amber-600' },
  { label: '已售', bg: 'bg-red-500', border: 'border-red-600' },
  { label: '已选', bg: 'bg-blue-500', border: 'border-blue-600' },
]

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
        setSelectedSeats((prev) => prev.filter((s) => s.seatIndex === seat.seatIndex))
      } else {
        if (selectedSeats.length >= 6) {
          message.warning('最多只能选择6个座位')
          return
        }
        setSelectedSeats((prev) => [...prev, seat])
      }
    },
    [isSelected, selectedSeats.length],
  )

  const totalPrice = selectedSeats.reduce((sum) => sum + (price || 0), 0)

  return (
    <div className="w-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* 银幕 */}
      <div className="px-4 pt-4 pb-2 text-center">
        <div className="w-3/5 mx-auto h-1.5 rounded-sm" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)' }} />
        <div className="text-[13px] text-muted mt-1">银幕</div>
      </div>

      {/* 座位网格 */}
      <div className="px-4 py-2 overflow-x-auto">
        <div className="inline-flex flex-col mx-auto gap-1.5">
          {buildGrid.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5">
              {row.map((seat, ci) => {
                if (!seat) return <div key={ci} className="w-9 h-9" />
                const sel = isSelected(seat)
                const status = sel ? 'selected' : seat.status
                const classes = STATUS_CLASSES[status] || STATUS_CLASSES.available
                const disabled = seat.status === 'locked' || seat.status === 'sold'
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleClick(seat)}
                    title={`${seat.seatLabel} ¥${price}`}
                    className={`w-9 h-9 rounded-lg border-2 text-[11px] font-semibold flex items-center justify-center transition-all ${classes} ${disabled ? 'opacity-70' : ''}`}
                  >
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
        <div className="px-4 py-2 bg-info-bg border-t border-info-border border-b flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-heading">已选：</span>
          {selectedSeats.map((s) => (
            <Tag key={s.seatIndex} color="blue" style={{ background: '#1677ff', color: '#fff', borderColor: '#1677ff' }}>{s.seatLabel} ¥{price}</Tag>
          ))}
          <span className="ml-auto text-sm font-bold text-price">合计：¥{totalPrice}</span>
        </div>
      )}

      {/* 统计 */}
      <div className="px-4 py-1.5 bg-subtle-bg border-b border-border flex justify-between text-[13px] text-muted">
        <span>共 <b className="text-heading">{availableSeats}</b> 个可选座位</span>
        <span>已选 {selectedSeats.length} 个座位</span>
      </div>

      {/* 确认按钮 */}
      <div className="p-3">
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
      <div className="px-4 py-2 bg-subtle-bg border-t border-border flex flex-wrap justify-center gap-3 text-xs text-muted">
        {LEGEND_ITEMS.map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded border-2 ${l.bg} ${l.border}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
