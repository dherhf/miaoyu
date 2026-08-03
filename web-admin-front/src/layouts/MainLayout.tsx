import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 侧边栏：flexShrink:0 固定宽度，折叠过渡由自身 transition 驱动 */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* 右侧：flex:1 自动占满剩余宽度 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 顶部栏 */}
        <Header />

        {/* 内容区域：撑满剩余高度 + 独立滚动 */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            minHeight: 0,
          }}
        >
          <Outlet />
        </main>

        {/* 页脚 */}
        <footer
          style={{
            textAlign: 'center',
            padding: '12px 0',
            color: '#666',
            flexShrink: 0,
            borderTop: '1px solid #eee',
          }}
        >
          © 2026 妙语购票 · 版权所有
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
