import { CarOutlined, EnvironmentOutlined } from '@ant-design/icons'
import type { BaseCardProps, RouteInfoCardData, RouteData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' },
  head: { padding: '16px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 8 },
  icon: { fontSize: 20, color: '#2563eb' },
  title: { fontSize: 16, fontWeight: 700, margin: 0, color: '#1e40af' },
  body: { padding: '16px' },
  routeCard: { padding: '12px', background: '#f9fafb', borderRadius: 8, marginBottom: 8 },
  routeHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  routeBadge: { fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  stat: { display: 'flex', gap: 24 },
  statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 700, color: '#111' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 },
}

const MODE_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  driving: { label: '驾车', icon: '🚗', bg: '#eff6ff', color: '#2563eb' },
  transit: { label: '公交', icon: '🚌', bg: '#f0fdf4', color: '#16a34a' },
  walking: { label: '步行', icon: '🚶', bg: '#fff7ed', color: '#ea580c' },
}

function formatDistance(distance: number): string {
  if (distance >= 1000) return (distance / 1000).toFixed(1) + ' km'
  return distance + ' m'
}

function formatDuration(duration: number): string {
  const min = Math.ceil(duration / 60)
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}小时${m}分` : `${h}小时`
  }
  return `${min} 分钟`
}

function extractRoutes(data: unknown): { mode: string; distance: number; duration: number }[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>

  // 聚合格式: { code:200, driving:[...], transit:{...} }
  const routes: { mode: string; distance: number; duration: number }[] = []
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'code' || key === 'message') continue
    const cfg = MODE_CONFIG[key]
    if (!cfg) continue
    // driving/walking 返回数组，transit 返回对象
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>
      routes.push({
        mode: key,
        distance: Number(first.distance) || 0,
        duration: Number(first.duration) || 0,
      })
    } else if (val && typeof val === 'object') {
      const transitData = val as Record<string, unknown>
      const transitList = transitData.transits as unknown[]
      if (Array.isArray(transitList) && transitList.length > 0) {
        const first = transitList[0] as Record<string, unknown>
        routes.push({
          mode: key,
          distance: Number(first.distance) || 0,
          duration: Number(first.duration) || 0,
        })
      }
    }
  }

  // 单一模式格式: { code:200, data:[...] } 或 { code:200, data:{transits:[...]} }
  if (routes.length === 0) {
    const dataField = obj.data
    if (Array.isArray(dataField)) {
      for (const item of dataField) {
        const r = item as Record<string, unknown>
        routes.push({
          mode: (r.mode as string) || 'driving',
          distance: Number(r.distance) || 0,
          duration: Number(r.duration) || 0,
        })
      }
    } else if (dataField && typeof dataField === 'object') {
      // transit 单模式: { data: { transits: [...] } }
      const transitList = (dataField as Record<string, unknown>).transits as unknown[]
      if (Array.isArray(transitList) && transitList.length > 0) {
        const first = transitList[0] as Record<string, unknown>
        routes.push({
          mode: 'transit',
          distance: Number(first.distance) || 0,
          duration: Number(first.duration) || 0,
        })
      }
    }
  }

  return routes
}

export default function RouteInfoCard({ data }: BaseCardProps<RouteInfoCardData>) {
  const routes = extractRoutes(data)
  const hasRoutes = routes.length > 0

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <CarOutlined style={S.icon} />
        <h3 style={S.title}>路线规划</h3>
      </div>
      <div style={S.body}>
        {hasRoutes ? (
          routes.map((route, i) => {
            const cfg = MODE_CONFIG[route.mode] || MODE_CONFIG.driving
            return (
              <div key={i} style={{ ...S.routeCard, background: cfg.bg }}>
                <div style={S.routeHeader}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ ...S.routeBadge, color: cfg.color, background: '#fff' }}>{cfg.label}</span>
                </div>
                <div style={S.stat}>
                  <div style={S.statItem}>
                    <span style={S.statValue}>{formatDistance(route.distance)}</span>
                    <span style={S.statLabel}>距离</span>
                  </div>
                  <div style={S.statItem}>
                    <span style={S.statValue}>{formatDuration(route.duration)}</span>
                    <span style={S.statLabel}>{cfg.label}耗时</span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={S.empty}>
            <EnvironmentOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
            未找到可用路线
          </div>
        )}
      </div>
    </div>
  )
}
