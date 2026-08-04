import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage } from './features/auth'
import { HomePage } from './home'
import { MovieListPage, MovieDetailPage } from './features/movie'
import { ChatListPage, ChatPage } from './features/agent'
import ProtectedRoute from './shared/ProtectedRoute'
import { MainLayout } from './layouts'

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
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
        path: '/movies',
        element: (
          <ProtectedRoute>
            <MovieListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/movies/:id',
        element: (
          <ProtectedRoute>
            <MovieDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/chat',
        element: (
          <ProtectedRoute>
            <ChatListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/chat/:id',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
