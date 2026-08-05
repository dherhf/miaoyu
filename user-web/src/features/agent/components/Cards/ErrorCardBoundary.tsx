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
        <div
          style={{
            width: '100%',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            color: '#b91c1c',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>卡片加载异常</div>
          <div style={{ fontSize: 12, color: '#ef4444', wordBreak: 'break-word' }}>
            {this.state.error?.message || '未知错误'}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
