import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, Typography } from 'antd'
import { LeftOutlined, LogoutOutlined, MessageOutlined, ProfileOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/features/auth'
import { getNotifications, markNotificationRead } from '@/features/notification'
import type { NotificationVO } from '@/features/notification/types'
import NotificationBell from '@/shared/NotificationBell'
import { useHeaderState } from './navBarStore'
import type { MenuProps } from 'antd'

const APP_TITLE = '妙语购票'

export function Header() {
  const state = useHeaderState()
  const navigate = useNavigate()
  const userInfo = useAuthStore((s) => s.userInfo)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  const logout = useAuthStore((s) => s.logout)
  const token = useAuthStore((s) => s.token)
  const [notifications, setNotifications] = useState<NotificationVO[]>([])

  useEffect(() => {
    if (!token) return
    fetchCurrentUser().catch(() => {})
    getNotifications(1, 20)
      .then((res) => setNotifications(res.records))
      .catch(() => {})
  }, [token, fetchCurrentUser])

  const handleNotificationRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n)),
    )
    try {
      await markNotificationRead(id)
    } catch {
      // 拦截器已统一提示
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const handleBack = state.showBack
    ? () => {
        if (typeof state.backPath === 'string') navigate(state.backPath)
        else navigate(-1)
      }
    : undefined

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <div className="py-1">
          <div className="text-sm text-heading font-medium">
            {userInfo?.nickname ?? '未知'}
          </div>
          <div className="text-[13px] text-muted">
            {userInfo?.phone ?? '-'}
          </div>
          <div className="text-[13px] text-muted">
            状态：{userInfo?.status === 1 ? '正常' : '禁用'}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'orders',
      label: '我的订单',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/orders'),
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  return (
    <header className="flex items-center px-3 py-2 h-12 border-b border-border bg-surface sticky top-0 z-40 flex-shrink-0 md:px-6">
      {handleBack ? (
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={handleBack}
          className="shrink-0"
        />
      ) : (
        <div className="w-10 shrink-0" />
      )}
      <Typography.Title level={5} className="m-0! flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap text-heading!">
        {APP_TITLE}
      </Typography.Title>
      {token ? (
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell
            items={notifications}
            onRead={handleNotificationRead}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {userInfo?.nickname ?? '用户'}
            </Button>
          </Dropdown>
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={() => navigate('/chat')}
          />
        </div>
      ) : (
        <div className="w-10 shrink-0" />
      )}
    </header>
  )
}
