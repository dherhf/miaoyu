import request from '@/shared/request'
import { withRetry } from '@/shared/retry'
import type {
  MovieListVO,
  MovieVO,
  PageResult,
  MovieListParams,
  ScheduleListVO,
  SeatMapVO,
  LockSeatResultVO,
  PayResultVO,
} from './types'

export async function getMovieList(
  params: MovieListParams,
): Promise<PageResult<MovieListVO>> {
  const res = await request.get<PageResult<MovieListVO>>('/movies', { params })
  return res.data
}

export async function getMovieDetail(id: string): Promise<MovieVO> {
  const res = await request.get<MovieVO>(`/movies/${id}`)
  return res.data
}

export async function getScheduleList(
  movieId: string,
): Promise<PageResult<ScheduleListVO>> {
  const res = await request.get<PageResult<ScheduleListVO>>('/schedules', {
    params: { movieId },
  })
  return res.data
}

export async function getSeatMap(scheduleId: number): Promise<SeatMapVO> {
  const res = await request.get<SeatMapVO>(`/schedules/${scheduleId}/seats`)
  return res.data
}

export async function lockSeat(
  scheduleId: number,
  seatIds: number[],
  requestId?: string,
): Promise<LockSeatResultVO> {
  const rid = requestId || crypto.randomUUID()
  return withRetry(async () => {
    const res = await request.post<LockSeatResultVO>(
      '/orders/lock-seat',
      { scheduleId, seatIds, ticketCount: seatIds.length },
      { headers: { 'X-Request-Id': rid } },
    )
    return res.data
  }, rid)
}

export async function payOrder(orderId: number, requestId?: string): Promise<PayResultVO> {
  const rid = requestId || crypto.randomUUID()
  return withRetry(async () => {
    const res = await request.post<PayResultVO>(`/orders/${orderId}/pay`, {}, {
      headers: { 'X-Request-Id': rid },
    })
    return res.data
  }, rid)
}
