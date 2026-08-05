import { ErrorBlock } from 'antd-mobile'
import type { BaseCardProps } from '../../types'

export default function FallbackCard({ data }: BaseCardProps<unknown>) {
  const jsonStr = (() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  })()

  return (
    <div
      style={{
        width: '100%',
        background: '#f9fafb',
        border: '1px dashed #d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#6b7280',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 300,
        overflowY: 'auto',
      }}
    >
      <ErrorBlock status="default" title="未知卡片类型（原始数据）" style={{ fontSize: 12 }} />
      {jsonStr}
    </div>
  )
}
