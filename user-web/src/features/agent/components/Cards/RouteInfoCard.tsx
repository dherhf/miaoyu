import { CarOutlined, EnvironmentOutlined } from '@ant-design/icons'
import type { BaseCardProps, RouteInfoCardData } from '../../types'

/** 出行方式 → 标签/图标/背景/文字颜色 配置 */
const MODE_CONFIG: Record<string, { label: string; icon: string; bgClass: string; textClass: string }> = {
  driving: { label: '驾车', icon: '🚗', bgClass: 'bg-info-bg', textClass: 'text-info-text' },
  transit: { label: '公交', icon: '🚌', bgClass: 'bg-success-bg', textClass: 'text-success-text' },
  walking: { label: '步行', icon: '🚶', bgClass: 'bg-warning-bg', textClass: 'text-warning-text' },
}

/**
 * 格式化距离：米 → 自动转 km。
 * @param distance 距离（米）
 * @returns 如 "1.2 km" 或 "800 m"
 */
function formatDistance(distance: number): string {
  if (distance >= 1000) return (distance / 1000).toFixed(1) + ' km'
  return distance + ' m'
}

/**
 * 格式化耗时：秒 → 自动转小时+分钟。
 * @param duration 耗时（秒）
 * @returns 如 "1小时30分" 或 "45 分钟"
 */
function formatDuration(duration: number): string {
  const min = Math.ceil(duration / 60)
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}小时${m}分` : `${h}小时`
  }
  return `${min} 分钟`
}

/**
 * 从高德路线 API 返回的数据中提取各出行方式的路线摘要。
 * 兼容两种数据格式：
 * 1. 聚合格式：{ code, driving:[...], transit:{transits:[...]} } —— 每种方式作为顶层字段
 * 2. 单一模式格式：{ code, data:[...] } 或 { code, data:{transits:[...]} } —— 统一放在 data 字段下
 *
 * @param data 原始路线数据（来自后端 routeInfo 卡片）
 * @returns 路线摘要数组：{ mode, distance, duration }
 */
function extractRoutes(data: unknown): { mode: string; distance: number; duration: number }[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>

  const routes: { mode: string; distance: number; duration: number }[] = []

  // --- 聚合格式：遍历顶层字段，查找 driving / walking / transit ---
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'code' || key === 'message') continue
    const cfg = MODE_CONFIG[key]
    if (!cfg) continue
    // driving / walking 返回数组，transit 返回对象（含 transits 子数组）
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>
      routes.push({
        mode: key,
        distance: Number(first.distance) || 0,
        duration: Number(first.duration) || 0,
      })
    } else if (val && typeof val === 'object') {
      // transit 格式：{ transits: [...] }
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

  // --- 单一模式格式：从 data 字段提取 ---
  if (routes.length === 0) {
    const dataField = obj.data
    if (Array.isArray(dataField)) {
      // data 为数组：每项含 mode / distance / duration
      for (const item of dataField) {
        const r = item as Record<string, unknown>
        routes.push({
          mode: (r.mode as string) || 'driving',
          distance: Number(r.distance) || 0,
          duration: Number(r.duration) || 0,
        })
      }
    } else if (dataField && typeof dataField === 'object') {
      // data 为对象：transit 单模式 { data: { transits: [...] } }
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

/**
 * 路线规划卡片：展示从用户当前位置到影院的出行路线。
 * 支持驾车、公交、步行三种方式的距离与耗时对比。
 * 数据来源：后端 routeInfo 卡片（高德路线规划 API）。
 */
export default function RouteInfoCard({ data }: BaseCardProps<RouteInfoCardData>) {
  const routes = extractRoutes(data)
  const hasRoutes = routes.length > 0

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border bg-surface">
      {/* 头部标题区 */}
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
                {/* 出行方式标签 */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{cfg.icon}</span>
                  <span className={`text-[13px] font-semibold px-2 py-0.5 rounded ${cfg.textClass} bg-surface`}>{cfg.label}</span>
                </div>
                {/* 距离 + 耗时 */}
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