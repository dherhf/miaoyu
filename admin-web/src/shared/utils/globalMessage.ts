import type { App } from 'antd';

// antd App 上下文类型
type AppContext = ReturnType<typeof App.useApp>;

// 全局 message 实例（供非组件模块使用，如 axios 拦截器）
let messageInstance: AppContext['message'] | null = null;

/**
 * 设置全局 message 实例
 * 在 App 组件挂载时调用，将 antd 的 message 注入到全局变量中，
 * 使 axios 请求/响应拦截器等非组件模块也能调用消息提示。
 *
 * @param message - antd App.useApp() 返回的 message 实例
 */
export function setGlobalMessage(message: AppContext['message']) {
  messageInstance = message;
}

/**
 * 获取全局 message 实例
 * 供 axios 拦截器等非组件模块调用，用于显示错误/成功提示。
 *
 * @returns message 实例（可能为 null，表示尚未初始化）
 */
export function getGlobalMessage() {
  return messageInstance;
}
