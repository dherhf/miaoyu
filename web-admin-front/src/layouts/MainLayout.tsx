import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminHeader as Header } from './Header';
import styles from './MainLayout.module.css';

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      {/* 侧边栏：flexShrink:0 固定宽度，折叠过渡由自身 transition 驱动 */}
      <Sidebar collapsed={collapsed} />

      {/* 右侧：flex:1 自动占满剩余宽度 */}
      <div className={styles.main}>
        {/* 顶部栏 */}
        <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* 内容区域：撑满剩余高度 + 独立滚动 */}
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
