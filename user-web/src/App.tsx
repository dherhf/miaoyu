import { RouterProvider } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { router } from './router'
import { setGlobalMessage } from './shared/globalMessage'

/**
 * 全局消息实例初始化组件。
 * 在 Ant Design App 上下文中获取 message 实例，注入到全局变量，
 * 以便在非组件环境（如 axios 拦截器）中使用消息提示。
 */
function GlobalMessageSetup() {
  const { message } = AntApp.useApp()
  setGlobalMessage(message)
  return null
}

/**
 * 应用根组件。
 * 包含全局消息初始化和路由提供者。
 */
export default function App() {
  return (
    <>
      <GlobalMessageSetup />
      <RouterProvider router={router} />
    </>
  )
}
