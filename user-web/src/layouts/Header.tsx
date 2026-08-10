import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, Tooltip, Typography } from 'antd'
import { EnvironmentOutlined, LeftOutlined, LogoutOutlined, MessageOutlined, MoonOutlined, ProfileOutlined, SunOutlined, SyncOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/features/auth'
import { getNotifications, markNotificationRead, subscribeNotifications } from '@/features/notification'
import type { NotificationVO } from '@/features/notification/types'
import NotificationBell from '@/shared/NotificationBell'
import { useGeoStore } from '@/shared/amap'
import { useThemeStore } from '@/shared/themeStore'
import { useHeaderState } from './navBarStore'
import type { MenuProps } from 'antd'

/** 应用标题 */
const APP_TITLE = '妙语购票'

/**
 * 顶部导航栏组件。
 * 功能包括：
 * - 返回按钮（由各页面通过 useHeaderBack 控制）
 * - 应用标题
 * - 主题切换（浅色/深色/跟随系统）
 * - 当前定位地址展示
 * - 订单入口、用户菜单（退出登录）
 * - AI 对话入口
 * - 通知铃铛（支持 SSE 实时推送）
 * 未登录时仅显示标题和主题切换按钮。
 */
export function Header() {
  // Header 返回按钮状态
  const state = useHeaderState()
  const navigate = useNavigate()
  // 用户信息
  const userInfo = useAuthStore((s) => s.userInfo)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  const logout = useAuthStore((s) => s.logout)
  // 登录令牌（用于判断是否已登录）
  const token = useAuthStore((s) => s.token)
  // 地理定位状态
  const geoLoading = useGeoStore((s) => s.loading)
  const location = useGeoStore((s) => s.location)
  // 主题模式
  const themeMode = useThemeStore((s) => s.mode)
  const cycleMode = useThemeStore((s) => s.cycleMode)
  const setMode = useThemeStore((s) => s.setMode)
  // 通知列表
  const [notifications, setNotifications] = useState<NotificationVO[]>([])

  // 根据当前主题模式选择对应图标
  const themeIcon = themeMode === 'light' ? <SunOutlined /> : themeMode === 'dark' ? <MoonOutlined /> : <SyncOutlined />

  // 拼接定位地址文本：优先显示详细地址，依次降级到区、市、省
  const addressText = location
    ? location.address || location.district || location.city || location.province
    : geoLoading
      ? '定位中...'
      : '未定位'

  // 登录后获取用户信息和通知列表
  useEffect(() => {
    if (!token) return
    fetchCurrentUser().catch(() => {})
    // 获取最近 20 条通知
    getNotifications(1, 20)
      .then((res) => setNotifications(res.records))
      .catch(() => {})
  }, [token, fetchCurrentUser])

  // 登录后订阅通知 SSE 推送，收到新通知时添加到列表头部
  useEffect(() => {
    if (!token) return
    const cleanup = subscribeNotifications((n) => {
      setNotifications((prev) => [n, ...prev])
    })
    return cleanup
  }, [token])

  /**
   * 标记通知为已读。
   * 先乐观更新本地状态，再调用后端接口。
   * @param id 通知ID
   */
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

  /** 退出登录：调用后端登出接口后跳转登录页 */
  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  // 返回按钮点击处理：有指定路径则导航到该路径，否则后退一步
  const handleBack = state.showBack
    ? () => {
        if (typeof state.backPath === 'string') navigate(state.backPath)
        else navigate(-1)
      }
    : undefined

  // 主题切换下拉菜单项
  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      label: '浅色',
      icon: <SunOutlined />,
    },
    {
      key: 'dark',
      label: '深色',
      icon: <MoonOutlined />,
    },
    {
      key: 'system',
      label: '跟随系统',
      icon: <SyncOutlined />,
    },
  ]

  // 用户下拉菜单项（展示用户信息 + 退出登录）
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
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  return (
    <header className="flex items-center px-3 py-2 h-12 border-b border-border bg-surface sticky top-0 z-40 flex-shrink-0 md:px-6">
      {/* 返回按钮区域 */}
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
      {/* 应用标题 */}
      <Typography.Title level={5} className="m-0! flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap text-heading!">
        {APP_TITLE}
      </Typography.Title>
      {/* 已登录时显示功能按钮区 */}
      {token ? (
        <div className="flex items-center gap-1 shrink-0">
          {/* 主题切换 */}
          <Dropdown
            menu={{ items: themeMenuItems, selectedKeys: [themeMode], onClick: ({ key }) => setMode(key as 'light' | 'dark' | 'system') }}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={themeIcon}
              onClick={cycleMode}
              className="shrink-0"
            />
          </Dropdown>
          {/* 当前定位地址 */}
          <Tooltip title={addressText} placement="bottom">
            <span
              className="flex items-center gap-1 text-sm text-muted max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap cursor-default"
            >
              <EnvironmentOutlined />
              <span className="hidden sm:inline">{addressText}</span>
            </span>
          </Tooltip>
          {/* 订单入口 */}
          <Button
            type="text"
            icon={<ProfileOutlined />}
            onClick={() => navigate('/orders')}
          />
          {/* 用户菜单 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              <span className="hidden sm:inline">{userInfo?.nickname ?? '用户'}</span>
            </Button>
          </Dropdown>
          {/* AI 对话入口 */}
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={() => navigate('/chat')}
          />
          {/* 通知铃铛 */}
          <NotificationBell
            items={notifications}
            onRead={handleNotificationRead}
          />
        </div>
      ) : (
        /* 未登录时仅显示主题切换 */
        <div className="flex items-center shrink-0">
          <Dropdown
            menu={{ items: themeMenuItems, selectedKeys: [themeMode], onClick: ({ key }) => setMode(key as 'light' | 'dark' | 'system') }}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={themeIcon}
              onClick={cycleMode}
            />
          </Dropdown>
        </div>
      )}
    </header>
  )
}
