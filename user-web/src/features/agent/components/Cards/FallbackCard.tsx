import { Empty } from 'antd'
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
    <div className="w-full bg-subtle-bg border border-dashed border-border rounded-lg p-3 text-xs font-mono text-muted whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
      <Empty description="未知卡片类型（原始数据）" className="text-xs" />
      {jsonStr}
    </div>
  )
}
