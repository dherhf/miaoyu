import { Badge, Button, Empty, Popover, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import type { NotificationVO } from '../features/notification/types';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  items: NotificationVO[];
  onRead?: (id: number) => void;
}

function formatTime(dt: string): string {
  if (!dt) return '';
  const date = new Date(dt);
  if (isNaN(date.getTime())) return dt;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneMin = 60 * 1000;
  const oneHour = 60 * oneMin;
  const oneDay = 24 * oneHour;
  if (diff < oneMin) return '刚刚';
  if (diff < oneHour) return `${Math.floor(diff / oneMin)}分钟前`;
  if (diff < oneDay && now.getDate() === date.getDate()) {
    return `${Math.floor(diff / oneHour)}小时前`;
  }
  if (diff < 2 * oneDay) return '昨天';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

export default function NotificationBell({ items, onRead }: NotificationBellProps) {
  const unreadCount = useMemo(
    () => items.filter((i) => i.isRead === 0).length,
    [items],
  );

  const content = items.length === 0 ? (
    <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} className={styles.empty} />
  ) : (
    <div className={styles.list}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => item.isRead === 0 && onRead?.(item.id)}
          className={`${styles.item}${item.isRead === 0 ? ' ' + styles.unread : ''}${item.isRead === 1 ? ' ' + styles.read : ''}`}
        >
          <div className={styles.itemHeader}>
            {item.isRead === 0 && <span className={styles.dot} />}
            <Typography.Text strong className={styles.title}>
              {item.title}
            </Typography.Text>
          </div>
          <Typography.Text type="secondary" className={styles.content}>
            {item.content}
          </Typography.Text>
          <div className={styles.time}>
            {formatTime(item.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Badge count={unreadCount} size="small" offset={[-2, 2]}>
      <Popover content={content} placement="bottomRight" trigger="click" arrow={false}>
        <Button type="text" icon={<BellOutlined />} className={styles.btn} />
      </Popover>
    </Badge>
  );
}
