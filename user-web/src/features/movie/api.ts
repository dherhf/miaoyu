import request from '@/shared/request'
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

/**
 * 获取影片列表（分页）。
 * 后端接口：GET /api/v1/movies
 * @param params 查询参数（关键词、类型、页码、每页条数、排序）
 * @returns 分页影片列表
 */
export async function getMovieList(
  params: MovieListParams,
): Promise<PageResult<MovieListVO>> {
  const res = await request.get<PageResult<MovieListVO>>('/movies', { params })
  return res.data
}

/**
 * 获取影片详情。
 * 后端接口：GET /api/v1/movies/{id}
 * @param id 影片ID
 * @returns 影片详细信息
 */
export async function getMovieDetail(id: string): Promise<MovieVO> {
  const res = await request.get<MovieVO>(`/movies/${id}`)
  return res.data
}

/**
 * 获取排片场次列表。
 * 后端接口：GET /api/v1/schedules?movieId={movieId}
 * @param movieId 影片ID
 * @returns 排片场次分页列表
 */
export async function getScheduleList(
  movieId: string,
): Promise<PageResult<ScheduleListVO>> {
  const res = await request.get<PageResult<ScheduleListVO>>('/schedules', {
    params: { movieId },
  })
  return res.data
}

/**
 * 获取场次座位图。
 * 后端接口：GET /api/v1/schedules/{scheduleId}/seats
 * @param scheduleId 场次ID
 * @returns 座位图信息（含行列布局和座位状态）
 */
export async function getSeatMap(scheduleId: number): Promise<SeatMapVO> {
  const res = await request.get<SeatMapVO>(`/schedules/${scheduleId}/seats`)
  return res.data
}

/**
 * 锁定座位并创建订单。
 * 后端接口：POST /api/v1/orders/lock-seat
 * 携带 X-Request-Id 请求头用于幂等控制。
 * @param scheduleId 场次ID
 * @param seatIds 座位ID列表
 * @returns 锁座结果（订单信息 + 过期时间）
 */
export async function lockSeat(
  scheduleId: number,
  seatIds: number[],
): Promise<LockSeatResultVO> {
  const res = await request.post<LockSeatResultVO>(
    '/orders/lock-seat',
    { scheduleId, seatIds, ticketCount: seatIds.length },
    { headers: { 'X-Request-Id': crypto.randomUUID() } },
  )
  return res.data
}

/**
 * 支付订单。
 * 后端接口：POST /api/v1/orders/{orderId}/pay
 * 携带 X-Request-Id 请求头用于幂等控制。
 * @param orderId 订单ID
 * @returns 支付结果（含取票码、场次和座位信息）
 */
export async function payOrder(orderId: number): Promise<PayResultVO> {
  const res = await request.post<PayResultVO>(`/orders/${orderId}/pay`, {}, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  })
  return res.data
}
