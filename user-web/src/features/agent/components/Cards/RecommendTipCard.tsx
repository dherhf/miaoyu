import { Button, ErrorBlock } from 'antd-mobile'
import type { BaseCardProps, RecommendTipCardData } from '../../types'

const configs: Record<string, { iconBg: string; iconColor: string; titleColor: string; btnColor: 'default' | 'primary' | 'success' | 'warning' | 'danger'; icon: string }> = {
  conflict: { iconBg: '#fff7ed', iconColor: '#ea580c', titleColor: '#9a3412', btnColor: 'warning', icon: '⚠' },
  soldOut: { iconBg: '#fef2f2', iconColor: '#dc2626', titleColor: '#991b1b', btnColor: 'danger', icon: '✕' },
  recommend: { iconBg: '#eff6ff', iconColor: '#2563eb', titleColor: '#1e40af', btnColor: 'primary', icon: '💡' },
  info: { iconBg: '#f9fafb', iconColor: '#6b7280', titleColor: '#374151', btnColor: 'default', icon: 'ℹ' },
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden' as const, border: '1px solid #e5e7eb' },
  head: { padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  title: { fontSize: 16, fontWeight: 700, margin: '0 0 4px' },
  desc: { fontSize: 14, color: '#6b7280', lineHeight: 1.5 },
  recSection: { padding: '8px 16px 12px' },
  recTitle: { fontSize: 13, color: '#6b7280', fontWeight: 500, marginBottom: 8 },
  recItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: '#fff', borderRadius: 8,
    border: '1px solid #e5e7eb', marginBottom: 6,
  },
  recNum: {
    width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, color: '#6b7280', flexShrink: 0,
  },
  recBody: { flex: 1, marginLeft: 12, fontSize: 13 },
  recName: { fontWeight: 500, color: '#111' },
  recReason: { fontSize: 12, color: '#2563eb', marginTop: 2 },
  actionWrap: { padding: '12px 16px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' },
}

export default function RecommendTipCard({ data, onAction }: BaseCardProps<RecommendTipCardData>) {
  const { tipType = 'info', title, description, recommendations, action } = data || {}
  const cfg = configs[tipType] || configs.info
  const isSeatRec = recommendations?.[0]?.seatLabel !== undefined
  const hasRecs = recommendations && recommendations.length > 0

  return (
    <div style={S.wrap}>
      {/* 头部 */}
      <div style={{ ...S.head, background: cfg.iconBg, borderBottom: `1px solid ${cfg.iconBg === '#f9fafb' ? '#e5e7eb' : 'transparent'}` }}>
        <div style={{ ...S.icon, background: cfg.iconBg, color: cfg.iconColor, border: `2px solid ${cfg.iconColor}` }}>
          {cfg.icon}
        </div>
        <div>
          <h3 style={{ ...S.title, color: cfg.titleColor }}>{title}</h3>
          {description && <p style={S.desc}>{description}</p>}
        </div>
      </div>

      {/* 推荐列表 */}
      {hasRecs ? (
        <div style={S.recSection}>
          <div style={S.recTitle}>{isSeatRec ? '推荐座位' : '推荐场次'}</div>
          {recommendations!.map((rec, i) => (
            <div key={i} style={S.recItem}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={S.recNum}>{i + 1}</div>
                <div style={S.recBody}>
                  <div style={S.recName}>
                    {isSeatRec ? rec.seatLabel : (rec as any).startTime}
                  </div>
                  {rec.reason && <div style={S.recReason}>✓ {rec.reason}</div>}
                </div>
              </div>
              <Button
                size="small"
                color="primary"
                fill="outline"
                onClick={() => onAction(`选推荐的${rec.seatLabel || (rec as any).sessionId || ''}`)}
              >
                选择
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <ErrorBlock status="empty" description="暂无可用推荐" style={{ padding: '24px 16px' }} />
      )}

      {/* 操作按钮 */}
      {action && (
        <div style={S.actionWrap}>
          <Button
            block
            color={cfg.btnColor}
            onClick={() => onAction(action)}
          >
            {action}
          </Button>
        </div>
      )}
    </div>
  )
}
