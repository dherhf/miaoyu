import React from 'react';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth';
import styles from './Header.module.css';

const AdminHeader: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('已退出登录');
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
      <div />

      <div className={styles.right}>

        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
        >
          <div className={styles.trigger}>
            {/* 头像 */}
            <div className={styles.avatar}>
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  className={styles.avatarImg}
                />
              ) : (
                <User size={18} color="#2563eb" />
              )}
            </div>

            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {currentUser?.realName || currentUser?.username || '管理员'}
              </div>
              <div className={styles.userRole}>
                管理员
              </div>
            </div>
            <ChevronDown size={14} color="#9ca3af" />
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default AdminHeader;