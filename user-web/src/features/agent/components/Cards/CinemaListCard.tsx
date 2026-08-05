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

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden' as const },
  item: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6' },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  name: { fontWeight: 700, fontSize: 15, color: '#111', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  rating: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexShrink: 0 },
  addr: { fontSize: 13, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 8 },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  tags: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  dist: { fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' as const },
}

export default function CinemaListCard({ data, onAction }: BaseCardProps<CinemaListCardData>) {
  const cinemas = data?.records || []
  if (cinemas.length === 0) {
    return <Empty description="暂无符合条件的影院" />
  }
  return (
    <div style={S.wrap}>
      {cinemas.map((c) => (
        <div key={c.id} style={S.item}>
          <div style={S.head}>
            <div style={S.name}>{c.name}</div>
            {c.rating != null && c.rating > 0 && (
              <div style={S.rating}><span>⭐</span><span style={{ color: '#d97706', fontWeight: 500 }}>{Number(c.rating).toFixed(1)}</span></div>
            )}
          </div>
          <div style={S.addr}>{c.address || ''}</div>
          <div style={S.meta}>
            <div style={S.tags}>
              {c.facilities?.map((f, i) => (
                <Tag key={i} color={getFacilityColor(f)}>{f}</Tag>
              ))}
            </div>
            {c.distance && <span style={S.dist}>距您 {c.distance}</span>}
          </div>
          <Button type="primary" block onClick={() => onAction(`选${c.name}`)}>
            选{c.name}
          </Button>
        </div>
      ))}
    </div>
  )
}
