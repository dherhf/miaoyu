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
  remainingSeconds?: number
}

export interface OrderDetailVO extends OrderVO {
  pickupCode?: string
  cancelReason?: string
  checkedAt?: string
}

export interface PickupCodeVO {
  pickupCode: string
  expiresIn: number
}
