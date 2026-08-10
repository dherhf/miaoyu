import React from 'react';
import { Typography } from 'antd';
import styles from './DashboardPage.module.css';

/** 图表卡片组件属性 */
export interface ChartCardProps {
  /** 卡片标题 */
  title: string;
  /** 标题图标组件 */
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  /** 卡片内容（图表或表格） */
  children: React.ReactNode;
}

/**
 * 图表卡片组件
 * 数据看板中用于包裹图表和表格的通用卡片容器，
 * 包含标题栏（图标 + 标题）和内容区域。
 */
export function ChartCard({ title, icon: Icon, children }: ChartCardProps) {
  return (
    <div className={styles.chartCard}>
      {/* 卡片头部：图标 + 标题 */}
      <div className={styles.chartCardHeader}>
        <Icon style={{ fontSize: 20, color: '#6b7280' }} />
        <Typography.Title level={5} className={styles.chartCardTitle}>{title}</Typography.Title>
      </div>
      {/* 卡片内容区 */}
      <div className={styles.chartCardBody}>{children}</div>
    </div>
  );
}
