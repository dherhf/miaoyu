import type { SeatVO } from '../types'

export default function SeatCell({
  seat,
  selected,
  onClick,
}: {
  seat: SeatVO
  selected: boolean
  onClick: () => void
}) {
  const base = 'w-7 h-7 rounded text-[10px] flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0 select-none'

  if (selected) {
    return (
      <div className={`${base} bg-accent text-white`} onClick={onClick} title={seat.seatLabel}>
        {seat.colIndex}
      </div>
    )
  }

  if (seat.status === 'sold') {
    return (
      <div className={`${base} bg-danger/40 text-white/70 cursor-not-allowed`} title={`${seat.seatLabel}（已售）`}>
        {seat.colIndex}
      </div>
    )
  }

  if (seat.status === 'locked') {
    return (
      <div className={`${base} bg-code-bg text-muted cursor-not-allowed`} title={`${seat.seatLabel}（已锁定）`}>
        {seat.colIndex}
      </div>
    )
  }

  return (
    <div
      className={`${base} bg-surface border border-border text-muted hover:border-accent hover:text-accent`}
      onClick={onClick}
      title={seat.seatLabel}
    >
      {seat.colIndex}
    </div>
  )
}
