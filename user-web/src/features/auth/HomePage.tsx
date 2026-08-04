import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, List, NavBar, SpinLoading } from 'antd-mobile'
import { useAuthStore } from './store'

export default function HomePage() {
  const navigate = useNavigate()
  const userInfo = useAuthStore((s) => s.userInfo)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  const logout = useAuthStore((s) => s.logout)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
      .catch(() => {
        // 拦截器已统一提示
      })
      .finally(() => setLoading(false))
  }, [fetchCurrentUser])

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <SpinLoading />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar>妙语购票</NavBar>
      <div style={{ flex: 1, padding: '16px' }}>
        {/* AI 购票入口 */}
        <div style={{ marginBottom: 16 }}>
          <Button
            block
            color="primary"
            size="large"
            onClick={() => navigate('/chat')}
          >
            🤖 AI 对话购票
          </Button>
        </div>
        <List header="用户信息">
          <List.Item extra={userInfo?.nickname ?? ''}>昵称</List.Item>
          <List.Item extra={userInfo?.phone ?? ''}>手机号</List.Item>
          <List.Item extra={userInfo?.status === 1 ? '正常' : '禁用'}>
            状态
          </List.Item>
        </List>
        <div style={{ marginTop: '24px' }}>
          <Button
            block
            color="danger"
            size="large"
            loading={logoutLoading}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </div>
    </div>
  )
}
