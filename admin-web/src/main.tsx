import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 1. 引入 Ant Design 的 ConfigProvider 和 中文语言包
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 2. 为底层的日期库 (dayjs) 设置中文
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ConfigProvider locale={zhCN}>
            <App />
        </ConfigProvider>
    </StrictMode>,
)
