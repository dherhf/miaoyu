import { Component, type ReactNode } from 'react'

/** ErrorCardBoundary Props */
interface Props {
  /** 子组件树 */
  children: ReactNode
  /** 自定义错误降级 UI（可选） */
  fallback?: ReactNode
}

/** ErrorCardBoundary 内部状态 */
interface State {
  /** 是否捕获到错误 */
  hasError: boolean
  /** 错误对象 */
  error: Error | null
}

/**
 * 卡片错误边界组件。
 * 使用 React Error Boundary 包裹每个卡片组件，
 * 在卡片渲染出错时捕获异常并展示友好降级 UI，避免整个对话页面崩溃。
 */
export default class ErrorCardBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /** 捕获渲染错误时更新 state，触发降级渲染 */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  /** 记录错误到控制台，便于开发调试 */
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorCardBoundary] 卡片渲染异常:', error, errorInfo)
  }

  render() {
    // 出错时展示降级 UI
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="w-full bg-danger-soft-bg border border-danger-soft-border rounded-lg p-3 text-[13px] text-danger-soft-text">
          <div className="font-semibold mb-1">卡片加载异常</div>
          <div className="text-xs text-price break-words">
            {this.state.error?.message || '未知错误'}
          </div>
        </div>
      )
    }

    // 正常时渲染子组件
    return this.props.children
  }
}