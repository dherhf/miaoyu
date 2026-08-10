import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, CinemaListCardData } from '../../types'

/** 影院设施类型 → AntD Tag 颜色映射表 */
const FACILITY_COLOR: Record<string, string> = {
  IMAX: 'warning',
  '杜比': 'processing',
  DOLBY: 'processing',
  '3D': 'error',
  CGS: 'success',
  '巨幕': 'success',
  LASER: 'error',
  '4K': 'processing',
}

/**
 * 根据设施名称获取对应的 Tag 颜色。
 * 优先精确匹配，其次将名称大写并去掉"影院"字样后匹配，兜底返回 default。
 * @param f 设施名称（如 "IMAX"、"杜比影院"）
 * @returns AntD Tag 颜色名
 */
function getFacilityColor(f: string): string {
  const exact = FACILITY_COLOR[f]
  if (exact) return exact
  const up = f?.toUpperCase().replace('影院', '').trim()
  return FACILITY_COLOR[up] || 'default'
}

/**
 * 影院列表卡片：以列表形式展示符合条件的一家或多影院。
 * 每行包含影院名、评分、地址、设施标签、距离与"选X"按钮；
 * 点击按钮触发 onAction 把选择意图作为消息发给对话。
 * 数据来源：后端返回的 cinemaList 卡片（基于高德/业务库查询）。
 */
export default function CinemaListCard({ data, onAction }: BaseCardProps<CinemaListCardData>) {
  const cinemas = data?.records || []
  // 无数据时展示空状态
  if (cinemas.length === 0) {
    return <Empty description="暂无符合条件的影院" />
  }
  return (
    <div className="w-full bg-surface rounded-lg overflow-hidden">
      {cinemas.map((c) => (
        <div key={c.id} className="px-4 py-3 border-b border-border last:border-b-0">
          {/* 影院名 + 评分 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-[15px] text-heading flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</div>
            {c.rating != null && c.rating > 0 && (
              <div className="flex items-center gap-1 text-xs shrink-0"><span>⭐</span><span className="text-rating font-medium">{Number(c.rating).toFixed(1)}</span></div>
            )}
          </div>
          {/* 影院地址 */}
          <div className="text-[13px] text-muted overflow-hidden text-ellipsis whitespace-nowrap mb-2">{c.address || ''}</div>
          {/* 设施标签 + 距离 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {c.facilities?.map((f, i) => (
                <Tag key={i} color={getFacilityColor(f)}>{f}</Tag>
              ))}
            </div>
            {c.distance && <span className="text-xs text-muted whitespace-nowrap">距您 {c.distance}</span>}
          </div>
          {/* 选择按钮：触发 onAction 选择该影院 */}
          <Button type="primary" block onClick={() => onAction(`选${c.name}`)}>
            选{c.name}
          </Button>
        </div>
      ))}
    </div>
  )
}