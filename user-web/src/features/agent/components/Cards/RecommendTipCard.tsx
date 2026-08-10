import { Button, Empty } from 'antd'
import type { BaseCardProps, RecommendTipCardData } from '../../types'

/** 不同提示类型的样式配置：背景/文字/标题/按钮/图标 */
const configs: Record<string, { bgClass: string; textClass: string; titleClass: string; btnProps: { type: 'primary' | 'default'; danger?: boolean; style?: React.CSSProperties }; icon: string }> = {
  conflict: { bgClass: 'bg-warning-bg', textClass: 'text-warning-text', titleClass: 'text-warning-text', btnProps: { type: 'primary', style: { background: '#faad14', borderColor: '#faad14' } }, icon: '⚠' },
  soldOut: { bgClass: 'bg-danger-soft-bg', textClass: 'text-price', titleClass: 'text-danger-soft-text', btnProps: { type: 'primary', danger: true }, icon: '✕' },
  recommend: { bgClass: 'bg-info-bg', textClass: 'text-info-text', titleClass: 'text-info-text', btnProps: { type: 'primary' }, icon: '💡' },
  info: { bgClass: 'bg-subtle-bg', textClass: 'text-muted', titleClass: 'text-heading', btnProps: { type: 'default' }, icon: 'ℹ' },
}

/**
 * 推荐 / 异常提示卡片：在选座冲突、座位售罄或需要推荐替代方案时展示。
 *
 * 功能：
 * - 根据 tipType 显示不同颜色主题（冲突/售罄/推荐/信息）
 * - 展示推荐座位或推荐场次列表，每项附推荐原因
 * - 点击推荐项的"选择"按钮触发 onAction 发送选择意图
 * - 底部可选操作按钮（如"换一场"），点击后发送对应消息
 */
export default function RecommendTipCard({ data, onAction }: BaseCardProps<RecommendTipCardData>) {
  const { tipType = 'info', title, description, recommendations, action } = data || {}
  const cfg = configs[tipType] || configs.info  // 获取当前提示类型对应的样式
  const isSeatRec = recommendations?.[0]?.seatLabel !== undefined  // 推荐项是否为座位推荐（有 seatLabel 字段）
  const hasRecs = recommendations && recommendations.length > 0

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border">
      {/* 头部：图标 + 标题 + 描述 */}
      <div className={`p-4 flex items-start gap-3 border-b border-border ${cfg.bgClass}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${cfg.bgClass} ${cfg.textClass}`} style={{ border: `2px solid currentColor` }}>
          {cfg.icon}
        </div>
        <div>
          <h3 className={`text-base font-bold m-0 mb-1 ${cfg.titleClass}`}>{title}</h3>
          {description && <p className="text-sm text-muted leading-1.5">{description}</p>}
        </div>
      </div>

      {/* 推荐列表（座位或场次） */}
      {hasRecs ? (
        <div className="px-4 py-2 pb-3">
          <div className="text-[13px] text-muted font-medium mb-2">{isSeatRec ? '推荐座位' : '推荐场次'}</div>
          {recommendations!.map((rec, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface rounded-lg border border-border mb-1.5 last:mb-0">
              <div className="flex items-center flex-1">
                {/* 序号 */}
                <div className="w-6 h-6 rounded-full bg-subtle-bg text-muted flex items-center justify-center text-xs shrink-0">{i + 1}</div>
                <div className="flex-1 ml-3 text-[13px]">
                  {/* 座位推荐显示 seatLabel，场次推荐显示 startTime */}
                  <div className="font-medium text-heading">
                    {isSeatRec ? rec.seatLabel : (rec as any).startTime}
                  </div>
                  {rec.reason && <div className="text-xs text-info-text mt-0.5">✓ {rec.reason}</div>}
                </div>
              </div>
              {/* 选择按钮：将推荐项作为消息发送 */}
              <Button
                size="small"
                type="default"
                onClick={() => onAction(`选推荐的${rec.seatLabel || (rec as any).sessionId || ''}`)}
              >
                选择
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无可用推荐" className="py-6 px-4" />
      )}

      {/* 底部操作按钮（可选） */}
      {action && (
        <div className="px-4 pb-4 pt-3 bg-subtle-bg border-t border-border">
          <Button
            block
            {...cfg.btnProps}
            onClick={() => onAction(action)}
          >
            {action}
          </Button>
        </div>
      )}
    </div>
  )
}