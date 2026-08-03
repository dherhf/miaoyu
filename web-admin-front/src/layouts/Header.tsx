import React, { useState, useEffect, useRef } from 'react';
import { User, Search, ChevronDown, LogOut } from 'lucide-react';
import { Dropdown, Input } from 'antd';
import type { MenuProps } from 'antd';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, USER_ROLE } from '../stores/authStore';

const AdminHeader: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setOpenMenu(false);
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

  const roleText = currentUser?.role === USER_ROLE.SUPER_ADMIN ? '超级管理员' : '管理员';

  return (
    <header style={{
      height: 64,
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* 搜索框 */}
      <div style={{ maxWidth: 480, width: '100%' }}>
        <Input
          placeholder="搜索功能、页面或数据..."
          prefix={<Search size={16} color="#9ca3af" />}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} ref={containerRef}>
        <div style={{ width: 1, height: 32, background: '#e5e7eb' }} />

        <Dropdown
          open={openMenu}
          menu={{ items: menuItems }}
          trigger={['click']}
          onOpenChange={setOpenMenu}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            {/* 头像 */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#eff6ff',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={18} color="#2563eb" />
              )}
            </div>

            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                {currentUser?.realName || currentUser?.username || '管理员'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {roleText}
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