export interface OrderVO {
  id: number
  orderNo: string
  movieName: string
  cinemaName: string
  hallName: string
  showDate: string
  startTime: string
  seatInfo: string
  ticketCount: number
  totalAmount: number
  status: string
  createdAt: string
  paidAt?: string
}

export interface OrderDetailVO extends OrderVO {
  pickupCode?: string
  cancelReason?: string
  checkedAt?: string
  payUrl?: string
  paymentNo?: string
  payExpireAt?: string
}

export interface PickupCodeVO {
  pickupCode: string
  expiresIn: number
}
