import React from 'react';
import { Typography } from 'antd';
import styles from './Home.module.css';

const Home: React.FC = () => {
  return (
    <div className={styles.pageWrap}>
      <div className={styles.bgCircle} />
      <Typography.Title level={1} className={styles.title}>
        影院管理后台
      </Typography.Title>
      <Typography.Text type="secondary" className={styles.subtitle}>
        一站式影院、影片、场次、订单管理系统
      </Typography.Text>
    </div>
  );
};

export default Home;
