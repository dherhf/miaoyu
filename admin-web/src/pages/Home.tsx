import React from 'react';
import { Typography } from 'antd';
import styles from './Home.module.css';

/**
 * 首页组件
 * 展示影院管理后台的欢迎页面，包含标题和副标题
 * （注：当前路由配置中根路径直接跳转到 /dashboard，此组件为备用入口）
 */
const Home: React.FC = () => {
  return (
    <div className={styles.pageWrap}>
      {/* 背景装饰圆 */}
      <div className={styles.bgCircle} />
      {/* 主标题 */}
      <Typography.Title level={1} className={styles.title}>
        影院管理后台
      </Typography.Title>
      {/* 副标题说明 */}
      <Typography.Text type="secondary" className={styles.subtitle}>
        一站式影院、影片、场次、订单管理系统
      </Typography.Text>
    </div>
  );
};

export default Home;
