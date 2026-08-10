import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
// 设置 dayjs 中文语言环境
dayjs.locale('zh-cn')
import './index.css'
import App from './App.tsx'

/**
 * 应用入口文件
 * 将根组件 App 渲染到 DOM 的 #root 节点
 * - StrictMode：开发模式下开启严格模式，检测潜在问题
 * - ConfigProvider：配置 antd 中文语言包
 * - AntApp：antd v5+ 的 App 组件，提供 message/notification/modal 静态方法上下文
 */
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* antd 中文语言配置 */}
        <ConfigProvider locale={zhCN}>
            {/* AntApp 提供全局消息/通知/弹窗的上下文 */}
            <AntApp>
                <App />
            </AntApp>
        </ConfigProvider>
    </StrictMode>,
)
