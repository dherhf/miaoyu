import { User, ChevronDown, LogOut } from 'lucide-react';
import { Button, Dropdown, App } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../features/auth';
import {
  getNotifications,
  markNotificationRead,
  subscribeNotifications,
} from '../features/notification';
import type { NotificationVO } from '../features/notification/types';
import NotificationBell from '../shared/components/NotificationBell';
import styles from './Header.module.css';

export interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminHeader({ collapsed, onToggle }: HeaderProps) {
  const { profile, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [notifications, setNotifications] = useState<NotificationVO[]>([]);

  useEffect(() => {
    if (!token) return;
    getNotifications(1, 20)
      .then((res) => setNotifications(res.records))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const cleanup = subscribeNotifications((n) => {
      setNotifications((prev) => [n, ...prev]);
    });
    return cleanup;
  }, [token]);

  const handleNotificationRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch {
      // 忽略，下次刷新会重新拉取
    }
  }, []);

  const handleLogout = () => {
    void logout();
    navigate('/login');
    void message.success('已退出登录');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'logout',
      danger: true,
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  return (
    <header className={styles.header}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        className={styles.foldBtn}
      />

      <div className={styles.right}>
        <NotificationBell
          items={notifications}
          onRead={handleNotificationRead}
        />

        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
        >
          <div className={styles.trigger}>
            {/* 头像 */}
            <div className={styles.avatar}>
              <User size={18} color="#2563eb" />
            </div>

            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {profile?.name || '管理员'}
              </div>
            </div>
            <ChevronDown size={14} color="#9ca3af" />
          </div>
        </Dropdown>
      </div>
    </header>
  );
}