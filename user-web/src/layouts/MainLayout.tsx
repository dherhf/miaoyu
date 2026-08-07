import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useGeoStore } from '@/shared/amap'

export function MainLayout() {
  const fetchLocation = useGeoStore((s) => s.fetchLocation)

  useEffect(() => {
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
