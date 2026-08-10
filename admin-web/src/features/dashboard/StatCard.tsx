import React from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import styles from './DashboardPage.module.css';

/**
 * 统计卡片数据项属性
 */
export interface StatItem {
  /** 指标标题（如"今日订单总数"） */
  title: string;
  /** 指标数值 */
  value: number;
  /** 单位：''（无）/ '¥'（元）/ '%'（百分比） */
  unit?: '' | '¥' | '%';
  /** 较昨日变化值（百分比） */
  change?: number;
  /** 变化方向：up=上升 / down=下降 */
  changeType?: 'up' | 'down';
  /** 图标组件 */
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  /** 主题颜色 */
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'pink' | 'indigo';
}

/**
 * 颜色 → 背景色/文字色映射表
 * 用于统计卡片图标的背景和文字颜色
 */
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

/**
 * 统计卡片组件
 * 数据看板中展示单个核心指标（如今日订单数、交易额等），
 * 包含标题、数值、单位、较昨日变化趋势（上升/下降）和主题色图标。
 */
export function StatCard({ title, value, unit = '', change, changeType = 'up', icon: Icon, color }: StatItem) {
  const styleConfig = colorMap[color];
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTop}>
        <div>
          {/* 指标标题 */}
          <p className={styles.statTitle}>{title}</p>
          {/* 指标数值（带单位） */}
          <p className={styles.statValue}>
            {unit === '¥' && <span className={styles.statUnitYen}>¥</span>}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit === '%' && <span className={styles.statUnitPercent}>%</span>}
          </p>
          {/* 较昨日变化趋势 */}
          {change !== undefined && (
            <div className={`${styles.statChange} ${changeType === 'up' ? styles.statChangeUp : styles.statChangeDown}`}>
              {changeType === 'up' ? <ArrowUpOutlined style={{ fontSize: 16 }} /> : <ArrowDownOutlined style={{ fontSize: 16 }} />}
              <span>{change}%</span>
              <span className={styles.statChangeLabel}>较昨日</span>
            </div>
          )}
        </div>
        {/* 主题色图标 */}
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
