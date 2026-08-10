import type { App } from 'antd'

// Ant Design App 上下文类型
type AppContext = ReturnType<typeof App.useApp>

// 全局 message 实例（在非组件环境中使用，如 axios 拦截器）
let messageInstance: AppContext['message'] | null = null

/**
 * 设置全局 message 实例。
 * 在 App 组件中通过 AntApp.useApp() 获取后调用此方法注入。
 * @param message Ant Design message 实例
 */
export function setGlobalMessage(message: AppContext['message']) {
  messageInstance = message
}

/**
 * 获取全局 message 实例。
 * 供 axios 拦截器等非组件环境调用消息提示。
 * @returns message 实例，未初始化时返回 null
 */
export function getGlobalMessage() {
  return messageInstance
}
