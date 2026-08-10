import React from 'react';
import { Tag } from 'antd';

/** 单个状态配置项 */
export interface StatusConfig {
  /** 状态值 */
  value: string;
  /** 状态显示文案 */
  label: string;
  /** 标签颜色（antd Tag 颜色） */
  color: string;
}

/** 状态标签组件属性 */
export interface StatusTagProps {
  /** 当前状态值 */
  status: string;
  /** 状态值到 {label, color} 的映射配置表 */
  configMap: Record<string, { label: string; color: string }>;
  /** 未命中配置时的兜底显示 */
  fallback?: { label: string; color: string };
}

/**
 * 通用状态标签组件
 * 根据状态值从配置表中匹配颜色与文案，未命中时使用 fallback。
 * 用于在表格中统一渲染状态列（如订单状态、影片上下架状态等）。
 *
 * @example
 * <StatusTag
 *   status="paid"
 *   configMap={{ paid: { label: '已支付', color: 'green' }, pending: { label: '待支付', color: 'orange' } }}
 * />
 */
const StatusTag: React.FC<StatusTagProps> = ({ status, configMap, fallback }) => {
  // 从配置表查找状态，未命中时使用 fallback 或原始值
  const cfg = configMap[status] || fallback || { label: status, color: 'default' };

  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default StatusTag;
