/** 通知信息 */
export interface NotificationVO {
  /** 通知ID */
  id: number
  /** 通知类型 */
  type: string
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 关联订单ID（可为 null） */
  relatedOrderId: number | null
  /** 是否已读：0=未读，1=已读 */
  isRead: number
  /** 创建时间 */
  createdAt: string
}

/** 分页查询结果 */
export interface PageResult<T> {
  /** 总记录数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页条数 */
  size: number
  /** 当前页数据列表 */
  records: T[]
}
