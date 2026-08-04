import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from 'antd';
import styles from './NotFound.module.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.wrap}>
      <div className={styles.bgCircle} />
      <div className={styles.content}>
        <Typography.Title className={styles.code}>
          404
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.description}>
          页面未找到，该地址不存在
        </Typography.Text>
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
