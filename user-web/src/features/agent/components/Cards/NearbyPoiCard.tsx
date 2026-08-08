import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import type { BaseCardProps, NearbyPoiCardData } from '../../types'

export default function NearbyPoiCard({ data }: BaseCardProps<NearbyPoiCardData>) {
  const pois = data?.data
  const hasPois = pois && pois.length > 0

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border bg-surface">
      <div className="px-4 py-4 bg-success-bg border-b border-info-border flex items-center gap-2">
        <EnvironmentOutlined className="text-xl text-success-text" />
        <h3 className="text-base font-bold m-0 text-success-text">周边推荐</h3>
      </div>
      <div className="py-2 max-h-[320px] overflow-y-auto">
        {hasPois ? (
          pois!.map((poi, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
              <div className="w-6 h-6 rounded-full bg-info-bg text-info-text flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-heading whitespace-nowrap overflow-hidden text-ellipsis">{poi.name}</div>
                {poi.address && <div className="text-xs text-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{poi.address}</div>}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {poi.distance && <Tag color="blue" style={{ fontSize: 11 }}>{poi.distance}m</Tag>}
                  {poi.type && <Tag style={{ fontSize: 11 }}>{poi.type}</Tag>}
                  {poi.tel && (
                    <span className="text-xs text-muted flex items-center gap-0.5">
                      <PhoneOutlined style={{ fontSize: 11 }} /> {poi.tel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted text-sm">暂无周边数据</div>
        )}
      </div>
    </div>
  )
}
