import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import {
  LayoutDashboard,
  Film,
  Building2,
  MapPin,
  CalendarDays,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/dashboard', label: '数据看板', icon: LayoutDashboard },
  { path: '/movies', label: '影片管理', icon: Film },
  { path: '/cinemas', label: '影院管理', icon: Building2 },
  { path: '/halls', label: '影厅管理', icon: MapPin },
  { path: '/schedules', label: '场次管理', icon: CalendarDays },
  { path: '/orders', label: '订单明细', icon: ShoppingCart },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('已退出登录');
  };

  const activePath = location.pathname === '/' ? '/dashboard' : location.pathname;

  const siderWidth = collapsed ? 64 : 256;

  return (
    <aside
      style={{
        width: siderWidth,
        minWidth: siderWidth,
        maxWidth: siderWidth,
        height: '100vh',
        background: '#1e293b',
        transition: 'width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Logo区域 */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #334155',
          padding: collapsed ? '0 8px' : '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#1677ff',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Film size={20} color="#fff" />
        </div>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>
            妙语购票
          </span>
        )}
      </div>

      {/* 折叠按钮 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 80,
          transform: 'translate(50%, 0)',
          zIndex: 10,
        }}
      >
        <Button
          shape="circle"
          size="small"
          type="primary"
          onClick={onToggle}
          icon={collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        />
      </div>

      {/* 菜单列表 */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          marginTop: 16,
          padding: '0 8px',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.path;
          return (
            <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  marginTop: 4,
                  background: isActive ? '#2563eb' : 'transparent',
                  color: isActive ? '#fff' : '#cbd5e1',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#334155';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 底部退出 */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#cbd5e1',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.2s',
          }}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#334155';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title={collapsed ? '退出登录' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>退出登录</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
