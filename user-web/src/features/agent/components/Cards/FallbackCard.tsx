import { Empty } from 'antd'
import type { BaseCardProps } from '../../types'

/**
 * 兜底卡片：当 CardRenderer 在注册表中找不到匹配的卡片类型时使用。
 * 以 JSON 文本形式展示原始数据，方便开发调试与问题排查。
 */
export default function FallbackCard({ data }: BaseCardProps<unknown>) {
  // 尝试将原始数据格式化为可读 JSON，失败则转为字符串
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