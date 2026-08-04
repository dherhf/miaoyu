import { createBrowserRouter, Navigate } from 'react-router-dom'
import { HomePage, LoginPage, RegisterPage } from './features/auth'
import AgentChatPage from './features/agent/AgentChatPage'
import CardPreviewPage from './features/agent/CardPreviewPage'
import ProtectedRoute from './shared/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <AgentChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/card-preview',
    element: <CardPreviewPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
