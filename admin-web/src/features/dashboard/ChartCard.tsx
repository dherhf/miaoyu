import React from 'react';
import { Typography } from 'antd';
import styles from './DashboardPage.module.css';

export interface ChartCardProps {
  title: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
}

export function ChartCard({ title, icon: Icon, children }: ChartCardProps) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartCardHeader}>
        <Icon style={{ fontSize: 20, color: '#6b7280' }} />
        <Typography.Title level={5} className={styles.chartCardTitle}>{title}</Typography.Title>
      </div>
      <div className={styles.chartCardBody}>{children}</div>
    </div>
  );
}
