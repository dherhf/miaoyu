import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from 'antd';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#ffffff',
    textAlign: 'center',
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
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  };
  const zWrap: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div style={wrapStyle}>
      <div style={bgCircle} />
      <div style={zWrap}>
        <Typography.Title style={{ fontSize: 96, fontWeight: 700, margin: 0 }}>
          404
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 18, marginTop: 16, display: 'block' }}>
          页面未找到，该地址不存在
        </Typography.Text>
        <Button
          type="primary"
          size="large"
          style={{ marginTop: 32 }}
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default NotFound;