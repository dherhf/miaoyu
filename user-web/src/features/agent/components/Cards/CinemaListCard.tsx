import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, CinemaListCardData } from '../../types'

const FACILITY_COLOR: Record<string, string> = {
  IMAX: 'warning',
  '杜比': 'processing',
  DOLBY: 'processing',
  '3D': 'error',
  CGS: 'success',
  '巨幕': 'success',
  LASER: 'error',
  '4K': 'processing',
}

function getFacilityColor(f: string): string {
  const exact = FACILITY_COLOR[f]
  if (exact) return exact
  const up = f?.toUpperCase().replace('影院', '').trim()
  return FACILITY_COLOR[up] || 'default'
}

export default function CinemaListCard({ data, onAction }: BaseCardProps<CinemaListCardData>) {
  const cinemas = data?.records || []
  if (cinemas.length === 0) {
    return <Empty description="暂无符合条件的影院" />
  }
  return (
    <div className="w-full bg-surface rounded-lg overflow-hidden">
      {cinemas.map((c) => (
        <div key={c.id} className="px-4 py-3 border-b border-border last:border-b-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-[15px] text-heading flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</div>
            {c.rating != null && c.rating > 0 && (
              <div className="flex items-center gap-1 text-xs shrink-0"><span>⭐</span><span className="text-rating font-medium">{Number(c.rating).toFixed(1)}</span></div>
            )}
          </div>
          <div className="text-[13px] text-muted overflow-hidden text-ellipsis whitespace-nowrap mb-2">{c.address || ''}</div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {c.facilities?.map((f, i) => (
                <Tag key={i} color={getFacilityColor(f)}>{f}</Tag>
              ))}
            </div>
            {c.distance && <span className="text-xs text-muted whitespace-nowrap">距您 {c.distance}</span>}
          </div>
          <Button type="primary" block onClick={() => onAction(`选${c.name}`)}>
            选{c.name}
          </Button>
        </div>
      ))}
    </div>
  )
}
