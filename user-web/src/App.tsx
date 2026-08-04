import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { router } from './router'
import { setGlobalMessage } from './shared/globalMessage'

function GlobalMessageSetup() {
  const { message } = AntApp.useApp()
  setGlobalMessage(message)
  return null
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#aa3bff',
          borderRadius: 8,
        },
      }}
    >
      <AntApp>
        <GlobalMessageSetup />
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
