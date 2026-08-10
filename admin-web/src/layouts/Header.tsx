import { User, ChevronDown, LogOut } from 'lucide-react';
import { Button, Dropdown, App } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth';
import styles from './Header.module.css';

/** 顶部栏组件属性 */
export interface HeaderProps {
  /** 侧边栏是否折叠 */
  collapsed: boolean;
  /** 切换侧边栏折叠/展开的回调 */
  onToggle: () => void;
}

/**
 * 顶部导航栏组件
 * - 左侧：侧边栏折叠/展开按钮
 * - 右侧：管理员头像 + 下拉菜单（退出登录）
 */
export function AdminHeader({ collapsed, onToggle }: HeaderProps) {
  // 从 auth store 获取当前管理员信息和退出登录方法
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  /**
   * 处理退出登录
   * 调用 store 的 logout 方法清除登录态，跳转到登录页，并提示成功
   */
  const handleLogout = () => {
    void logout();
    navigate('/login');
    void message.success('已退出登录');
  };

  // 下拉菜单项配置
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
      {/* 折叠/展开按钮 */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        className={styles.foldBtn}
      />

      <div className={styles.right}>
        {/* 管理员信息下拉菜单 */}
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
