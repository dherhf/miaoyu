import type { BaseCardProps, CinemaListCardData } from '../../types'

const facilityColors: Record<string, { bg: string; text: string; border: string }> = {
  IMAX: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  '杜比': { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  DOLBY: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  '3D': { bg: '#fce7f3', text: '#be185d', border: '#fbcfe8' },
  CGS: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  '巨幕': { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  LASER: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  '4K': { bg: '#cffafe', text: '#0e7490', border: '#a5f3fc' },
}

function getFacilityColor(f: string) {
  const exact = facilityColors[f]
  if (exact) return exact
  const up = f?.toUpperCase().replace('影院', '').trim()
  return facilityColors[up] || { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }
}

const ss = {
  wrap: { width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden' as const },
  item: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6' },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  name: { fontWeight: 700, fontSize: 15, color: '#111', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  rating: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexShrink: 0 },
  addr: { fontSize: 13, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 8 },
  meta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  tags: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  tag: { fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid' },
  dist: { fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' as const },
  btn: { width: '100%', padding: '8px 16px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },
}

export default function CinemaListCard({ data, onAction }: BaseCardProps<CinemaListCardData>) {
  const cinemas = data?.cinemas || []
  if (cinemas.length === 0) {
    return <div style={ss.empty}><span style={{ fontSize: 48, marginBottom: 8 }}>🏢</span><span>暂无符合条件的影院</span></div>
  }
  return (
    <div style={ss.wrap}>
      {cinemas.map((c) => (
        <div key={c.id} style={ss.item}>
          <div style={ss.head}>
            <div style={ss.name}>{c.name}</div>
            {c.rating != null && c.rating > 0 && (
              <div style={ss.rating}><span>⭐</span><span style={{ color: '#d97706', fontWeight: 500 }}>{Number(c.rating).toFixed(1)}</span></div>
            )}
          </div>
          <div style={ss.addr}>{c.address || ''}</div>
          <div style={ss.meta}>
            <div style={ss.tags}>
              {c.facilities?.map((f, i) => {
                const cl = getFacilityColor(f)
                return <span key={i} style={{ ...ss.tag, background: cl.bg, color: cl.text, borderColor: cl.border }}>{f}</span>
              })}
            </div>
            {c.distance && <span style={ss.dist}>距您 {c.distance}</span>}
          </div>
          <button style={ss.btn} onClick={() => onAction(`选${c.name}`)}>选{c.name}</button>
        </div>
      ))}
    </div>
  )
}
