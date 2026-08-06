import { CarOutlined, EnvOutlined } from '@ant-design/icons'
import type { BaseCardProps, RouteInfoCardData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' },
  head: { padding: '16px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 8 },
  icon: { fontSize: 20, color: '#2563eb' },
  title: { fontSize: 16, fontWeight: 700, margin: 0, color: '#1e40af' },
  body: { padding: '16px' },
  stat: { display: 'flex', gap: 24, marginBottom: 12 },
  statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 700, color: '#111' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 },
}

const MODE_LABELS: Record<string, string> = {
  driving: '驾车',
  transit: '公交',
  walking: '步行',
}

export default function RouteInfoCard({ data }: BaseCardProps<RouteInfoCardData>) {
  const routes = data?.data
  const hasRoutes = routes && routes.length > 0

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <CarOutlined style={S.icon} />
        <h3 style={S.title}>路线规划</h3>
      </div>
      <div style={S.body}>
        {hasRoutes ? (
          routes!.map((route, i) => {
            const km = route.distance >= 1000 ? (route.distance / 1000).toFixed(1) + ' km' : route.distance + ' m'
            const min = Math.ceil(route.duration / 60)
            const mode = MODE_LABELS[(route as any).mode] || '驾车'
            return (
              <div key={i} style={{ marginBottom: i < routes!.length - 1 ? 16 : 0 }}>
                <div style={S.stat}>
                  <div style={S.statItem}>
                    <span style={S.statValue}>{km}</span>
                    <span style={S.statLabel}>距离</span>
                  </div>
                  <div style={S.statItem}>
                    <span style={S.statValue}>{min}</span>
                    <span style={S.statLabel}>分钟（{mode}）</span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={S.empty}>
            <EnvOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
            未找到可用路线
          </div>
        )}
      </div>
    </div>
  )
}
