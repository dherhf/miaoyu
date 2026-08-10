import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import GlobalMessage from './shared/globalMessage'

export default function App() {
  return (
    <>
      <GlobalMessage />
      <RouterProvider router={router} />
    </>
  )
}
