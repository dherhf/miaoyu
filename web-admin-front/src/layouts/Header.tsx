import { User, ChevronDown, LogOut } from 'lucide-react';
import { Button, Dropdown, App } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth';
import styles from './Header.module.css';

export interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminHeader({ collapsed, onToggle }: HeaderProps) {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

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