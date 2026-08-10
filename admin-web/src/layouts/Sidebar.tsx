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

/** 侧边栏组件属性 */
export interface SidebarProps {
  /** 是否折叠（收起） */
  collapsed: boolean;
}

/**
 * 侧边栏菜单配置
 * path: 路由路径
 * label: 菜单显示文字
 * icon: 菜单图标组件
 */
const menuItems = [
  { path: '/dashboard', label: '数据看板', icon: LayoutDashboard },
  { path: '/movies', label: '影片管理', icon: Film },
  { path: '/cinemas', label: '影院管理', icon: Building2 },
  { path: '/halls', label: '影厅管理', icon: MapPin },
  { path: '/schedules', label: '场次管理', icon: CalendarDays },
  { path: '/orders', label: '订单明细', icon: ShoppingCart },
];

/**
 * 侧边栏导航组件
 * - 顶部 Logo 区域（折叠时仅显示图标）
 * - 菜单列表，根据当前路由高亮对应菜单项
 * - 支持折叠/展开，折叠时宽度 64px，展开时 256px
 */
export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();

  // 当前路径为根路径时默认高亮数据看板
  const activePath = location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <Sider
      trigger={null}      // 不显示默认的折叠触发器
      collapsible
      collapsed={collapsed}
      width={256}          // 展开时宽度
      collapsedWidth={64} // 折叠时宽度
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
          // 判断当前菜单项是否激活
          const isActive = activePath === item.path;
          const itemClass = isActive
            ? `${styles.menuItem} ${styles.active}`
            : styles.menuItem;
          return (
            <Link key={item.path} to={item.path} className={styles.menuLink}>
              <div
                className={itemClass}
                // 折叠状态下鼠标悬浮显示完整文字
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
