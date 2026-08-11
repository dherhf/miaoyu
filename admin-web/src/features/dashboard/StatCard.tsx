import React from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import styles from './DashboardPage.module.css';

export interface StatItem {
  title: string;
  value: number;
  unit?: '' | '¥' | '%';
  change?: number | string;
  changeType?: 'up' | 'down';
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'pink' | 'indigo';
}

const colorMap = {
  blue: { bg: '#eff6ff', text: '#2563eb' },
  green: { bg: '#f0fdf4', text: '#16a34a' },
  orange: { bg: '#fff7ed', text: '#ea580c' },
  red: { bg: '#fef2f2', text: '#dc2626' },
  purple: { bg: '#faf5ff', text: '#9333ea' },
  cyan: { bg: '#ecfeff', text: '#0891b2' },
  pink: { bg: '#fdf2f8', text: '#db2777' },
  indigo: { bg: '#eef2ff', text: '#4f46e5' },
};

export function StatCard({ title, value, unit = '', change, changeType = 'up', icon: Icon, color }: StatItem) {
  const styleConfig = colorMap[color];
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTop}>
        <div>
          <p className={styles.statTitle}>{title}</p>
          <p className={styles.statValue}>
            {unit === '¥' && <span className={styles.statUnitYen}>¥</span>}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit === '%' && <span className={styles.statUnitPercent}>%</span>}
          </p>
          {change !== undefined && (
            <div className={`${styles.statChange} ${changeType === 'up' ? styles.statChangeUp : styles.statChangeDown}`}>
              {changeType === 'up' ? <ArrowUpOutlined style={{ fontSize: 16 }} /> : <ArrowDownOutlined style={{ fontSize: 16 }} />}
              <span>{change}%</span>
              <span className={styles.statChangeLabel}>较昨日</span>
            </div>
          )}
        </div>
        <div
          className={styles.statIconWrapper}
          style={{ background: styleConfig.bg, color: styleConfig.text }}
        >
          <Icon style={{ fontSize: 24 }} />
        </div>
      </div>
    </div>
  );
}
