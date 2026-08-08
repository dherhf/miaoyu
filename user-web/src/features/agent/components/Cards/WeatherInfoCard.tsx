import { CloudOutlined } from '@ant-design/icons'
import type { BaseCardProps, WeatherInfoCardData, WeatherCast } from '../../types'

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
      <div className="w-full rounded-xl overflow-hidden border border-border bg-surface">
        <div className="px-4 py-4 bg-info-bg border-b border-info-border flex items-center gap-2">
          <CloudOutlined className="text-xl text-info-text" />
          <h3 className="text-base font-bold m-0 text-info-text">天气查询</h3>
        </div>
        <div className="text-center py-6 text-muted text-sm">暂无天气数据</div>
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
    <div className="w-full rounded-xl overflow-hidden border border-border bg-surface">
      <div className="px-4 py-4 bg-info-bg border-b border-info-border flex items-center gap-2">
        <CloudOutlined className="text-xl text-info-text" />
        <h3 className="text-base font-bold m-0 text-info-text">{w.city || '天气'}</h3>
      </div>
      <div className="px-4 py-5">
        <div className="flex items-center gap-4">
          <span className="text-[40px]">{icon}</span>
          <div>
            <div>
              <span className="text-4xl font-bold text-heading">{temperature}</span>
              <span className="text-lg font-medium text-muted">°C</span>
            </div>
            <div className="text-base font-medium text-heading">{weather}</div>
          </div>
        </div>
        <div className="flex gap-5 mt-4 flex-wrap">
          <div className="flex flex-col items-center">
            <span className="text-[15px] font-semibold text-heading">{windDir}</span>
            <span className="text-xs text-muted mt-0.5">风向</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[15px] font-semibold text-heading">{windPow}级</span>
            <span className="text-xs text-muted mt-0.5">风力</span>
          </div>
          {w.humidity && (
            <div className="flex flex-col items-center">
              <span className="text-[15px] font-semibold text-heading">{w.humidity}%</span>
              <span className="text-xs text-muted mt-0.5">湿度</span>
            </div>
          )}
        </div>

        {/* 多日预报（跳过今天，避免重复） */}
        {futureForecasts.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="text-[13px] text-muted font-medium mb-2">未来天气</div>
            <div className="flex gap-3 overflow-x-auto">
              {futureForecasts.map((cast: WeatherCast, i: number) => (
                <div key={i} className="shrink-0 px-3 py-2 bg-subtle-bg rounded-lg text-center min-w-[72px]">
                  <div className="text-xs text-muted font-medium">{i === 0 ? '明天' : formatDate(cast.date)}</div>
                  <div className="text-xl my-1">{getWeatherIcon(cast.dayweather)}</div>
                  <div className="text-xs text-heading">{cast.dayweather || '—'}</div>
                  <div className="text-[13px] font-semibold text-heading mt-0.5">{cast.daytemp || '—'}°/{cast.nighttemp || '—'}°</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
