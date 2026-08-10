/** 订单列表项 */
export interface OrderVO {
  /** 订单ID */
  id: number
  /** 订单编号 */
  orderNo: string
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开始时间 */
  startTime: string
  /** 座位信息（文本描述） */
  seatInfo: string
  /** 票数 */
  ticketCount: number
  /** 总金额（元） */
  totalAmount: number
  /** 订单状态：pending=待支付, paid=已支付, cancelled=已取消, refunded=已退票, checked=已检票, expired=已过期 */
  status: string
  /** 创建时间 */
  createdAt: string
  /** 支付时间 */
  paidAt?: string
  /** 剩余支付时间（秒），仅待支付状态有值 */
  remainingSeconds?: number
}

/** 订单详情（继承订单列表项，增加更多字段） */
export interface OrderDetailVO extends OrderVO {
  /** 取票码 */
  pickupCode?: string
  /** 取消原因 */
  cancelReason?: string
  /** 检票时间 */
  checkedAt?: string
}

/** 取票码响应 */
export interface PickupCodeVO {
  /** 取票码 */
  pickupCode: string
  /** 有效期剩余秒数 */
  expiresIn: number
}
