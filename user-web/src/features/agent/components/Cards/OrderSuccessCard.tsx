import { Toast } from 'antd-mobile'
import type { BaseCardProps, OrderSuccessCardData } from '../../types'

const st = {
  wrap: { width: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' as const },
  hero: { background: 'linear-gradient(180deg, #f0fdf4, #fff)', padding: '32px 16px 24px', textAlign: 'center' as const },
  checkmark: {
    width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #4ade80, #16a34a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', boxShadow: '0 0 0 8px rgba(74,222,128,0.15)',
  },
  title: { fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af' },
  codeSection: { padding: '20px 16px', borderBottom: '1px dashed #e5e7eb', textAlign: 'center' as const },
  codeLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  code: { fontSize: 36, fontWeight: 700, letterSpacing: 4, color: '#111', cursor: 'pointer', userSelect: 'all' as const },
  codeHint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  detailSection: { padding: '16px' },
  detailBg: { background: '#f9fafb', borderRadius: 8, padding: '12px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' },
  rowBold: { fontWeight: 700, color: '#111' },
  amount: { fontSize: 18, fontWeight: 700, color: '#dc2626' },
  barcodeSection: { padding: '12px 16px', background: '#f9fafb' },
  bars: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 1, height: 40, overflow: 'hidden' },
  barCodeText: { fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', letterSpacing: 3, textAlign: 'center' as const, marginTop: 4 },
  actions: { padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  primaryBtn: { width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1677ff', color: '#fff', fontSize: 15, fontWeight: 500 },
  secondaryBtn: { width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', color: '#6b7280', fontSize: 15, fontWeight: 500 },
}

const BAR_WIDTHS = [2, 4, 2, 6, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4, 2, 6, 2, 4, 2, 8, 2, 4]

export default function OrderSuccessCard({ data, onAction }: BaseCardProps<OrderSuccessCardData>) {
  const { pickupCode, movieName, cinemaName, cinemaAddress, hallName, showDate, startTime, seatInfo, totalAmount, orderNo } = data || {}

  const code = pickupCode || '888888'

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // 降级
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    Toast.show({ content: `取票码 ${code} 已复制`, icon: 'success' })
  }

  const fmtTime = () => {
    if (!showDate || !startTime) return '-'
    const d = new Date(showDate)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${m}月${day}日 ${startTime}`
  }

  return (
    <div style={st.wrap}>
      {/* 成功头部 */}
      <div style={st.hero}>
        <div style={st.checkmark}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 12 10 17 19 7" />
          </svg>
        </div>
        <div style={st.title}>支付成功！</div>
        <div style={st.subtitle}>您的电影票已预订成功</div>
      </div>

      {/* 取票码 */}
      <div style={st.codeSection}>
        <div style={st.codeLabel}>取票码</div>
        <div style={st.code} onClick={copyCode}>{code}</div>
        <div style={st.codeHint}>长按或点击复制</div>
      </div>

      {/* 详情 */}
      <div style={st.detailSection}>
        <div style={st.detailBg}>
          <div style={st.row}><span>影片</span><span style={st.rowBold}>{movieName}</span></div>
          <div style={st.row}><span>影院</span><span>{cinemaName}</span></div>
          <div style={st.row}><span>地址</span><span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cinemaAddress}</span></div>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
          <div style={st.row}><span>影厅</span><span>{hallName}</span></div>
          <div style={st.row}><span>时间</span><span>{fmtTime()}</span></div>
          <div style={st.row}><span>座位</span><span>{seatInfo}</span></div>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
          <div style={st.row}><span>金额</span><span style={st.amount}>¥{totalAmount}</span></div>
        </div>
      </div>

      {/* 条形码 */}
      <div style={st.barcodeSection}>
        <div style={st.bars}>
          {BAR_WIDTHS.map((w, i) => (
            <div key={i} style={{ width: w, height: '100%', background: '#1f2937', borderRadius: 1 }} />
          ))}
        </div>
        <div style={st.barCodeText}>{orderNo}</div>
      </div>

      {/* 按钮 */}
      <div style={st.actions}>
        <button style={st.primaryBtn} onClick={() => onAction('查看我的订单')}>查看我的订单</button>
        <button style={st.secondaryBtn} onClick={() => onAction('我想看其他电影')}>继续购票</button>
      </div>
    </div>
  )
}
