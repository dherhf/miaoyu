import { Link, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import {
  LayoutDashboard,
  Film,
  Building2,
  MapPin,
  CalendarDays,
  ShoppingCart,
} from 'lucide-react';
import styles from './Sidebar.module.css';
const { Sider } = Layout;

export interface SidebarProps {
  collapsed: boolean;
}

const menuItems = [
  { path: '/dashboard', label: '数据看板', icon: LayoutDashboard },
  { path: '/movies', label: '影片管理', icon: Film },
  { path: '/cinemas', label: '影院管理', icon: Building2 },
  { path: '/halls', label: '影厅管理', icon: MapPin },
  { path: '/schedules', label: '场次管理', icon: CalendarDays },
  { path: '/orders', label: '订单明细', icon: ShoppingCart },
];

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();

  const activePath = location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={256}
      collapsedWidth={64}
      theme="light"
      className={styles.sider}
    >
      {/* Logo区域 */}
      <div className={styles.logo}>
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="妙语购票" className={styles.logoIcon} />
        {!collapsed && (
          <span className={styles.logoText}>妙语购票</span>
        )}
      </div>

      {/* 菜单列表 */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.path;
          const itemClass = isActive
            ? `${styles.menuItem} ${styles.active}`
            : styles.menuItem;
          return (
            <Link key={item.path} to={item.path} className={styles.menuLink}>
              <div
                className={itemClass}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className={styles.menuIcon} />
                {!collapsed && <span className={styles.menuText}>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </Sider>
  );
}
