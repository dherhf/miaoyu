export interface NotificationVO {
  id: number;
  type: string;
  title: string;
  content: string;
  relatedOrderId: number | null;
  isRead: number;
  createdAt: string;
}

export interface PageResult<T> {
  total: number;
  page: number;
  size: number;
  records: T[];
}
