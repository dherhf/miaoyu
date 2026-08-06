import { CloudOutlined } from '@ant-design/icons'
import type { BaseCardProps, WeatherInfoCardData, WeatherCast } from '../../types'

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
  meta: { display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' as const },
  metaItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  metaValue: { fontSize: 15, fontWeight: 600, color: '#111' },
  metaLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  forecastSection: { marginTop: 16, borderTop: '1px solid #f3f4f6', paddingTop: 12 },
  forecastTitle: { fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 8 },
  forecastRow: { display: 'flex', gap: 12, overflowX: 'auto' as const },
  forecastCard: { flexShrink: 0, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, textAlign: 'center', minWidth: 72 },
  forecastDate: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  forecastIcon: { fontSize: 20, margin: '4px 0' },
  forecastWeather: { fontSize: 12, color: '#374151' },
  forecastTemp: { fontSize: 13, fontWeight: 600, color: '#111', marginTop: 2 },
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

function getWeatherIcon(weather?: string): string {
  if (!weather) return '🌤️'
  for (const [key, icon] of Object.entries(WEATHER_ICON)) {
    if (weather.includes(key)) return icon
  }
  return '🌤️'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`
  return dateStr
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

  const forecasts = w.forecasts || w.casts || []
  const hasForecasts = forecasts.length > 0
  const today = hasForecasts ? forecasts[0] : null

  // 从 forecasts 提取展示数据
  const weather = today?.dayweather || w.weather || '—'
  const temperature = today?.daytemp || w.temperature || '—'
  const windDir = today?.daywind || w.windDirection || '—'
  const windPow = today?.daypower || w.windPower || '—'
  const icon = getWeatherIcon(weather)

  // 未来预报从 index 1 开始（跳过今天，今天已在主区域展示）
  const futureForecasts = forecasts.slice(1)

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
              <span style={S.temp}>{temperature}</span>
              <span style={S.tempUnit}>°C</span>
            </div>
            <div style={S.weather}>{weather}</div>
          </div>
        </div>
        <div style={S.meta}>
          <div style={S.metaItem}>
            <span style={S.metaValue}>{windDir}</span>
            <span style={S.metaLabel}>风向</span>
          </div>
          <div style={S.metaItem}>
            <span style={S.metaValue}>{windPow}级</span>
            <span style={S.metaLabel}>风力</span>
          </div>
          {w.humidity && (
            <div style={S.metaItem}>
              <span style={S.metaValue}>{w.humidity}%</span>
              <span style={S.metaLabel}>湿度</span>
            </div>
          )}
        </div>

        {/* 多日预报（跳过今天，避免重复） */}
        {futureForecasts.length > 0 && (
          <div style={S.forecastSection}>
            <div style={S.forecastTitle}>未来天气</div>
            <div style={S.forecastRow}>
              {futureForecasts.map((cast: WeatherCast, i: number) => (
                <div key={i} style={S.forecastCard}>
                  <div style={S.forecastDate}>{i === 0 ? '明天' : formatDate(cast.date)}</div>
                  <div style={S.forecastIcon}>{getWeatherIcon(cast.dayweather)}</div>
                  <div style={S.forecastWeather}>{cast.dayweather || '—'}</div>
                  <div style={S.forecastTemp}>{cast.daytemp || '—'}°/{cast.nighttemp || '—'}°</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
