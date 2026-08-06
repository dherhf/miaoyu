import { CloudOutlined } from '@ant-design/icons'
import type { BaseCardProps, WeatherInfoCardData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' },
  head: { padding: '16px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 8 },
  icon: { fontSize: 20, color: '#2563eb' },
  title: { fontSize: 16, fontWeight: 700, margin: 0, color: '#1e40af' },
  body: { padding: '20px 16px' },
  main: { display: 'flex', alignItems: 'center', gap: 16 },
  temp: { fontSize: 36, fontWeight: 700, color: '#111' },
  tempUnit: { fontSize: 18, fontWeight: 500, color: '#6b7280' },
  weather: { fontSize: 16, fontWeight: 500, color: '#374151' },
  city: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  meta: { display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' as const },
  metaItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  metaValue: { fontSize: 15, fontWeight: 600, color: '#111' },
  metaLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 },
}

const WEATHER_ICON: Record<string, string> = {
  '晴': '☀️',
  '多云': '⛅',
  '阴': '☁️',
  '小雨': '🌦️',
  '中雨': '🌧️',
  '大雨': '🌧️',
  '暴雨': '⛈️',
  '雷阵雨': '⛈️',
  '雪': '🌨️',
}

export default function WeatherInfoCard({ data }: BaseCardProps<WeatherInfoCardData>) {
  const w = data?.data
  if (!w) {
    return (
      <div style={S.wrap}>
        <div style={S.head}>
          <CloudOutlined style={S.icon} />
          <h3 style={S.title}>天气查询</h3>
        </div>
        <div style={S.empty}>暂无天气数据</div>
      </div>
    )
  }

  const icon = WEATHER_ICON[w.weather] || '🌤️'

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <CloudOutlined style={S.icon} />
        <h3 style={S.title}>{w.city || '天气'}</h3>
      </div>
      <div style={S.body}>
        <div style={S.main}>
          <span style={{ fontSize: 40 }}>{icon}</span>
          <div>
            <div>
              <span style={S.temp}>{w.temperature}</span>
              <span style={S.tempUnit}>°C</span>
            </div>
            <div style={S.weather}>{w.weather}</div>
          </div>
        </div>
        <div style={S.meta}>
          {w.windDirection && (
            <div style={S.metaItem}>
              <span style={S.metaValue}>{w.windDirection}</span>
              <span style={S.metaLabel}>风向</span>
            </div>
          )}
          {w.windPower && (
            <div style={S.metaItem}>
              <span style={S.metaValue}>{w.windPower}级</span>
              <span style={S.metaLabel}>风力</span>
            </div>
          )}
          {w.humidity && (
            <div style={S.metaItem}>
              <span style={S.metaValue}>{w.humidity}%</span>
              <span style={S.metaLabel}>湿度</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
