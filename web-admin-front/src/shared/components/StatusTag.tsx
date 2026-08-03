import React from 'react';
import { Tag } from 'antd';

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
}

export interface StatusTagProps {
  /** 当前状态值 */
  status: string;
  /** 状态映射配置表 */
  configMap: Record<string, { label: string; color: string }>;
  /** 默认兜底配置 */
  fallback?: { label: string; color: string };
}

/**
 * 通用状态标签组件
 * 根据状态值从配置表中匹配颜色与文案，未命中时使用 fallback
 *
 * @example
 * <StatusTag
 *   status="paid"
 *   configMap={{ paid: { label: '已支付', color: 'green' }, pending: { label: '待支付', color: 'orange' } }}
 * />
 */
const StatusTag: React.FC<StatusTagProps> = ({ status, configMap, fallback }) => {
  const cfg = configMap[status] || fallback || { label: status, color: 'default' };

  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default StatusTag;
