import type { BaseCardProps, RecommendTipCardData } from '../../types'

const configs: Record<string, { iconBg: string; iconColor: string; titleColor: string; btnBg: string; icon: string }> = {
  conflict: { iconBg: '#fff7ed', iconColor: '#ea580c', titleColor: '#9a3412', btnBg: '#ea580c', icon: '⚠' },
  soldOut: { iconBg: '#fef2f2', iconColor: '#dc2626', titleColor: '#991b1b', btnBg: '#dc2626', icon: '✕' },
  recommend: { iconBg: '#eff6ff', iconColor: '#2563eb', titleColor: '#1e40af', btnBg: '#2563eb', icon: '💡' },
  info: { iconBg: '#f9fafb', iconColor: '#6b7280', titleColor: '#374151', btnBg: '#6b7280', icon: 'ℹ' },
}

const sr = {
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
  selectBtn: { padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 500 },
  actionBtn: {
    width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none',
    cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 500,
    margin: '0 16px 16px',
  },
}

export default function RecommendTipCard({ data, onAction }: BaseCardProps<RecommendTipCardData>) {
  const { tipType = 'info', title, description, recommendations, action } = data || {}
  const cfg = configs[tipType] || configs.info
  const isSeatRec = recommendations?.[0]?.seatLabel !== undefined
  const hasRecs = recommendations && recommendations.length > 0

  return (
    <div style={sr.wrap}>
      {/* 头部 */}
      <div style={{ ...sr.head, background: cfg.iconBg, borderBottom: `1px solid ${cfg.iconBg === '#f9fafb' ? '#e5e7eb' : 'transparent'}` }}>
        <div style={{ ...sr.icon, background: cfg.iconBg, color: cfg.iconColor, border: `2px solid ${cfg.iconColor}` }}>
          {cfg.icon}
        </div>
        <div>
          <h3 style={{ ...sr.title, color: cfg.titleColor }}>{title}</h3>
          {description && <p style={sr.desc}>{description}</p>}
        </div>
      </div>

      {/* 推荐列表 */}
      {hasRecs ? (
        <div style={sr.recSection}>
          <div style={sr.recTitle}>{isSeatRec ? '推荐座位' : '推荐场次'}</div>
          {recommendations!.map((rec, i) => (
            <div key={i} style={sr.recItem}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={sr.recNum}>{i + 1}</div>
                <div style={sr.recBody}>
                  <div style={sr.recName}>
                    {isSeatRec ? rec.seatLabel : (rec as any).startTime}
                  </div>
                  {rec.reason && <div style={sr.recReason}>✓ {rec.reason}</div>}
                </div>
              </div>
              <button
                style={sr.selectBtn}
                onClick={() => onAction(`选推荐的${rec.seatLabel || (rec as any).sessionId || ''}`)}
              >
                选择
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          暂无可用推荐
        </div>
      )}

      {/* 操作按钮 */}
      {action && (
        <div style={{ padding: '12px 16px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <button style={{ ...sr.actionBtn, background: cfg.btnBg }} onClick={() => onAction(action)}>
            {action}
          </button>
        </div>
      )}
    </div>
  )
}
