import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminHeader as Header } from './Header';
import styles from './MainLayout.module.css';

/**
 * 后台主布局组件
 * 整体布局结构：左侧侧边栏 + 右侧（顶部栏 + 内容区 + 页脚）
 * - 侧边栏宽度固定，折叠时过渡动画由组件自身 CSS 驱动
 * - 内容区撑满剩余高度，独立滚动
 * - Outlet 渲染匹配的子路由组件
 */
export function MainLayout() {
  // 侧边栏折叠状态
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      {/* 侧边栏：flexShrink:0 固定宽度，折叠过渡由自身 transition 驱动 */}
      <Sidebar collapsed={collapsed} />

      {/* 右侧：flex:1 自动占满剩余宽度 */}
      <div className={styles.main}>
        {/* 顶部栏：传递折叠状态和切换回调 */}
        <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* 内容区域：撑满剩余高度 + 独立滚动，Outlet 渲染子路由 */}
        <main className={styles.content}>
          <Outlet />
        </main>

        {/* 页脚 */}
        <footer className={styles.footer}>
          © 2026 妙语购票 · 版权所有
        </footer>
      </div>
    </div>
  );
}
