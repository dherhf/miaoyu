import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorCardBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorCardBoundary] 卡片渲染异常:', error, errorInfo)
  }

  render() {
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

    return this.props.children
  }
}
