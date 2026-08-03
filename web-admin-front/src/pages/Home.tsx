import React from 'react';
import { Typography } from 'antd';

const Home: React.FC = () => {
  const pageWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 120px)',
    background: '#ffffff',
    textAlign: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  };
  const bgCircle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  };

  return (
    <div style={pageWrap}>
      <div style={bgCircle} />
      <Typography.Title level={1} style={{ zIndex: 1, margin: '0 0 16px', fontWeight: 800, position: 'relative' }}>
        影院管理后台
      </Typography.Title>
      <Typography.Text type="secondary" style={{ fontSize: 22, zIndex: 1, position: 'relative' }}>
        一站式影院、影片、场次、订单管理系统
      </Typography.Text>
    </div>
  );
};

export default Home;