import React, { useCallback } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { Inbox } from 'lucide-react';

export interface DataTableColumnConfig {
  /** 状态列映射配置，当列使用 StatusTag 渲染时传入 */
  statusConfigMap?: Record<string, { label: string; color: string }>;
}

export interface DataTableProps<T extends Record<string, any>>
  extends Omit<TableProps<T>, 'loading' | 'pagination'> {
  /** 是否加载中，展示骨架屏 */
  loading?: boolean;
  /** 总条数 */
  total?: number;
  /** 当前页码 */
  currentPage?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 可选每页条数 */
  pageSizeOptions?: number[];
  /** 分页变更 */
  onPageChange?: (page: number, pageSize: number) => void;
  /** 空状态文案 */
  emptyText?: string;
  /** 空状态图片 */
  emptyIcon?: React.ReactNode;
  /** 操作列 fixed */
  actionFixed?: boolean | 'right' | 'left';
}

/**
 * 通用数据表格组件
 * - 统一分页配置和交互
 * - 内置 loading 骨架屏
 * - 内置空状态（图标 + 文案）
 * - 标准行选择集成
 *
 * @example
 * <DataTable<MovieItem>
 *   rowKey="id"
 *   columns={columns}
 *   dataSource={list}
 *   loading={isLoading}
 *   total={total}
 *   currentPage={page}
 *   pageSize={size}
 *   onPageChange={(p, ps) => { setPage(p); setSize(ps); }}
 *   emptyText="暂无影片数据"
 * />
 */
function DataTable<T extends Record<string, any>>({
  loading = false,
  total = 0,
  currentPage = 1,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  emptyText = '暂无数据',
  emptyIcon,
  rowSelection,
  scroll,
  ...rest
}: DataTableProps<T>) {
  const handlePageChange = useCallback(
    (page: number, ps: number) => {
      onPageChange?.(page, ps);
    },
    [onPageChange],
  );

  const mergedScroll = scroll ?? { x: 'max-content' };

  return (
    <Table<T>
      loading={loading}
      bordered
      scroll={mergedScroll}
      rowSelection={rowSelection}
      locale={{
        emptyText: (
          <div style={{ padding: '40px 0' }}>
            {emptyIcon || <Inbox size={48} color="#d9d9d9" />}
            <div style={{ marginTop: 12, color: '#999', fontSize: 14 }}>
              {emptyText}
            </div>
          </div>
        ),
      }}
      pagination={
        total > 0
          ? {
              current: currentPage,
              pageSize,
              total,
              pageSizeOptions,
              showSizeChanger: true,
              showTotal: (t: number) => `共 ${t} 条`,
              onChange: handlePageChange,
            }
          : false
      }
      {...rest}
    />
  );
}

export default DataTable;
