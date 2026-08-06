import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import type { BaseCardProps, NearbyPoiCardData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' },
  head: { padding: '16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 },
  icon: { fontSize: 20, color: '#16a34a' },
  title: { fontSize: 16, fontWeight: 700, margin: 0, color: '#15803d' },
  body: { padding: '8px 0', maxHeight: 320, overflowY: 'auto' as const },
  item: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f3f4f6' },
  num: { width: 24, height: 24, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  addr: { fontSize: 12, color: '#6b7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' as const },
  empty: { textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 },
}

export default function NearbyPoiCard({ data }: BaseCardProps<NearbyPoiCardData>) {
  const pois = data?.data
  const hasPois = pois && pois.length > 0

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <EnvironmentOutlined style={S.icon} />
        <h3 style={S.title}>周边推荐</h3>
      </div>
      <div style={S.body}>
        {hasPois ? (
          pois!.map((poi, i) => (
            <div key={i} style={S.item}>
              <div style={S.num}>{i + 1}</div>
              <div style={S.itemBody}>
                <div style={S.name}>{poi.name}</div>
                {poi.address && <div style={S.addr}>{poi.address}</div>}
                <div style={S.meta}>
                  {poi.distance && <Tag color="blue" style={{ fontSize: 11 }}>{poi.distance}m</Tag>}
                  {poi.type && <Tag style={{ fontSize: 11 }}>{poi.type}</Tag>}
                  {poi.tel && (
                    <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <PhoneOutlined style={{ fontSize: 11 }} /> {poi.tel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={S.empty}>暂无周边数据</div>
        )}
      </div>
    </div>
  )
}
