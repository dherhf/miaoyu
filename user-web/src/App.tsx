import { RouterProvider } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { router } from './router'
import { setGlobalMessage } from './shared/globalMessage'

function GlobalMessageSetup() {
  const { message } = AntApp.useApp()
  setGlobalMessage(message)
  return null
}

export default function App() {
  return (
    <>
      <GlobalMessageSetup />
      <RouterProvider router={router} />
    </>
  )
}
