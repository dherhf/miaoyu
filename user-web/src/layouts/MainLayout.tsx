import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useGeoStore } from '@/shared/amap'

/**
 * 主布局组件。
 * 包含顶部 Header、内容区域和底部 Footer。
 * 布局挂载时自动获取用户地理位置信息。
 * 子路由通过 Outlet 渲染在内容区域。
 */
export function MainLayout() {
  // 获取地理位置的方法
  const fetchLocation = useGeoStore((s) => s.fetchLocation)

  useEffect(() => {
    // 布局加载时自动获取定位
    fetchLocation().catch(() => {})
  }, [fetchLocation])

  return (
    <div className="flex flex-col h-svh overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
      <footer className="text-center py-3 text-muted text-xs flex-shrink-0 border-t border-border">
        © 2026 妙语购票 · 版权所有
      </footer>
    </div>
  )
}
