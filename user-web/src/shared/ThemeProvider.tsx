import type { ReactNode } from 'react'
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useThemeStore } from './themeStore'

/**
 * 主题提供者组件。
 * 根据当前主题模式（浅色/深色）配置 Ant Design 的主题算法和全局 token。
 * 同时提供 Ant Design App 上下文（message/modal/notification 静态方法）。
 * @param children 子组件
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // 是否为深色模式
  const isDark = useThemeStore((s) => s.isDark)

  return (
    <ConfigProvider
      locale={zhCN}  // 中文语言包
      theme={{
        // 根据深色/浅色模式选择对应算法
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        // 全局主题 token：主色调紫色，圆角 8px
        token: { colorPrimary: '#aa3bff', borderRadius: 8 },
      }}
    >
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  )
}
