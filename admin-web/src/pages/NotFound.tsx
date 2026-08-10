import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from 'antd';
import styles from './NotFound.module.css';

/**
 * 404 页面未找到组件
 * 当用户访问不存在的路由时展示此页面，
 * 提供"返回首页"按钮引导用户回到管理后台首页。
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.wrap}>
      {/* 背景装饰圆 */}
      <div className={styles.bgCircle} />
      <div className={styles.content}>
        {/* 404 错误码 */}
        <Typography.Title className={styles.code}>
          404
        </Typography.Title>
        {/* 提示文案 */}
        <Typography.Text type="secondary" className={styles.description}>
          页面未找到，该地址不存在
        </Typography.Text>
        {/* 返回首页按钮 */}
        <Button
          type="primary"
          size="large"
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
