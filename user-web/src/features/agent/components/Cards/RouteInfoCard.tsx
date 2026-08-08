import { CarOutlined, EnvironmentOutlined } from '@ant-design/icons'
import type { BaseCardProps, RouteInfoCardData } from '../../types'

const MODE_CONFIG: Record<string, { label: string; icon: string; bgClass: string; textClass: string }> = {
  driving: { label: '驾车', icon: '🚗', bgClass: 'bg-info-bg', textClass: 'text-info-text' },
  transit: { label: '公交', icon: '🚌', bgClass: 'bg-success-bg', textClass: 'text-success-text' },
  walking: { label: '步行', icon: '🚶', bgClass: 'bg-warning-bg', textClass: 'text-warning-text' },
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
    <div className="w-full rounded-xl overflow-hidden border border-border bg-surface">
      <div className="px-4 py-4 bg-info-bg border-b border-info-border flex items-center gap-2">
        <CarOutlined className="text-xl text-info-text" />
        <h3 className="text-base font-bold m-0 text-info-text">路线规划</h3>
      </div>
      <div className="p-4">
        {hasRoutes ? (
          routes.map((route, i) => {
            const cfg = MODE_CONFIG[route.mode] || MODE_CONFIG.driving
            return (
              <div key={i} className={`p-3 rounded-lg mb-2 last:mb-0 ${cfg.bgClass}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{cfg.icon}</span>
                  <span className={`text-[13px] font-semibold px-2 py-0.5 rounded ${cfg.textClass} bg-surface`}>{cfg.label}</span>
                </div>
                <div className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[22px] font-bold text-heading">{formatDistance(route.distance)}</span>
                    <span className="text-xs text-muted mt-0.5">距离</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[22px] font-bold text-heading">{formatDuration(route.duration)}</span>
                    <span className="text-xs text-muted mt-0.5">{cfg.label}耗时</span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-6 text-muted text-sm">
            <EnvironmentOutlined className="text-[32px] mb-2 block" />
            未找到可用路线
          </div>
        )}
      </div>
    </div>
  )
}
