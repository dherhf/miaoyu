import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
// 设置 dayjs 中文语言环境
dayjs.locale('zh-cn')
import App from './App'
import { ThemeProvider } from './shared/ThemeProvider'
import './index.css'

// 应用入口：挂载 React 根节点，启用严格模式与主题提供者
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
