export interface MovieListVO {
  id: string
  name: string
  types: string[]
  posterUrl: string
  rating: number
  duration: number
  releaseDate: string
  status: number
}

export interface MovieVO {
  id: string
  name: string
  types: string[]
  posterUrl: string
  rating: number
  duration: number
  releaseDate: string
  director: string
  actors: string
  description: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface PageResult<T> {
  total: number
  page: number
  size: number
  records: T[]
}

export interface MovieListParams {
  keyword?: string
  type?: string
  page?: number
  size?: number
  sort?: string
}

export interface ScheduleListVO {
  id: number
  movieId: number
  movieName: string
  cinemaId: number
  cinemaName: string
  hallId: number
  hallName: string
  showDate: string
  startTime: string
  endTime: string
  price: number
  languageVersion: string
  totalSeats: number
  availableSeats: number
  soldSeats: number
  occupancyRate: number
  status: string
  createdAt: string
}

export interface SeatVO {
  hallCellId: number
  seatIndex: number
  rowIndex: number
  colIndex: number
  seatLabel: string
  seatCategory: string
  status: string
}

export interface SeatMapVO {
  scheduleId: number
  hallId: number
  totalRows: number
  totalCols: number
  totalSeats: number
  availableSeats: number
  seats: SeatVO[]
}

export interface LockSeatResultVO {
  id: number
  orderNo: string
  scheduleId: number
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
}

export interface PayResultVO {
  id: number
  orderNo: string
  status: string
  pickupCode: string
  movieName: string
  cinemaName: string
  cinemaAddress: string
  hallName: string
  showDate: string
  startTime: string
  seatInfo: string
  totalAmount: number
}
