import type { ReactNode } from 'react'
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useThemeStore } from './themeStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useThemeStore((s) => s.isDark)

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#aa3bff', borderRadius: 8 },
      }}
    >
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  )
}
