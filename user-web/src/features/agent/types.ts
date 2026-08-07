// ---- 请求 / 响应类型 ----

export interface CreateSessionRequest {
  title?: string
}

export interface CreateSessionResponse {
  sessionId: string
  title: string
  status: string
  slotState: unknown
  createdAt: string
}

export interface SendMessageRequest {
  content: string
  seatIds?: string[]
  scheduleId?: string
  ticketCount?: number
  requestId?: string
  /** 用户当前经度（GCJ-02，由前端高德定位提供） */
  longitude?: number
  /** 用户当前纬度（GCJ-02） */
  latitude?: number
  /** 用户当前城市 */
  city?: string
}

export interface SessionSummary {
  sessionId: string
  title: string
  status: string
  lastMessageAt: string
  createdAt: string
}

export interface SessionListResponse {
  total: number
  page: number
  size: number
  records: SessionSummary[]
}

export interface MessageItem {
  msgId: number
  role: string
  content: string
  cardType: string | null
  cardData: unknown
  intent: string | null
  slots: unknown
  createdAt: string
}

export interface SessionDetailResponse {
  sessionId: string
  title: string
  status: string
  slotState: unknown
  createdAt: string
  messages: MessageItem[]
}

// ---- SSE 事件类型 ----

export interface SseMessageEvent {
  content: string
}

export interface SseCardEvent {
  cardType: string
  cardData: unknown
}

export interface SseDoneEvent {
  sessionId: string
  intent: string
  slots: unknown
  title?: string
}

export interface SseErrorEvent {
  code: string | number
  message: string
}

export interface SseCallbacks {
  onMessage: (event: SseMessageEvent) => void
  onCard: (event: SseCardEvent) => void
  onDone: (event: SseDoneEvent) => void
  onError: (event: SseErrorEvent) => void
}

// ---- 卡片类型 ----

export type CardType =
  | 'movieList'
  | 'cinemaList'
  | 'sessionList'
  | 'seatMap'
  | 'orderConfirm'
  | 'orderSuccess'
  | 'recommendTip'
  | 'pendingOrder'
  | 'orderList'
  | 'routeInfo'
  | 'nearbyPoi'
  | 'weatherInfo'

// 影片卡片数据
export interface MovieItem {
  id: number
  name: string
  posterUrl: string
  rating?: number
  types?: string[]
  duration?: number
}
export type MovieListCardData = { records: MovieItem[]; total?: number }

// 影院卡片数据
export interface CinemaItem {
  id: number
  name: string
  address?: string
  distance?: string
  facilities?: string[]
  rating?: number
}
export type CinemaListCardData = { records: CinemaItem[]; total?: number }

// 场次卡片
export interface SessionItem {
  id: number
  cinemaName: string
  showDate: string
  startTime: string
  endTime: string
  hallName: string
  languageVersion: string
  price: number
  availableSeats: number
}
export type SessionListCardData = { records: SessionItem[]; total?: number }

// 座位卡片
export interface Seat {
  seatIndex: number
  rowIndex: number
  colIndex: number
  seatLabel: string
  seatCategory: 'regular' | 'vip' | 'couple' | 'wheelchair'
  status: 'available' | 'locked' | 'sold'
}
export type SeatMapCardData = {
  sessionId: number
  totalRows: number
  totalCols: number
  availableSeats: number
  price: number
  seats: Seat[]
}

// 订单确认卡片
export type OrderConfirmCardData = {
  id: number
  status: 'pending' | 'paid' | 'cancelled'
  movieName: string
  cinemaName: string
  hallName: string
  showDate: string
  startTime: string
  seatInfo: string
  ticketCount: number
  totalAmount: number
  orderNo: string
  remainingTime: number
  expireAt: string
}

// 支付成功卡片
export type OrderSuccessCardData = {
  pickupCode: string
  movieName: string
  cinemaName: string
  cinemaAddress: string
  hallName: string
  showDate: string
  startTime: string
  seatInfo: string
  totalAmount: number
  orderNo: string
}

// 订单查询列表
export interface OrderItem {
  id: number
  orderNo: string
  status: 'pending' | 'paid' | 'checked' | 'cancelled' | 'refunded'
  movieName: string
  cinemaName: string
  showDate: string
  startTime: string
  seatInfo: string
  ticketCount: number
  totalAmount: number
  createdAt: string
}
export type OrderListCardData = {
  records: OrderItem[]
  total?: number
  page?: number
  size?: number
}

// 推荐/异常卡片
export interface RecommendItem {
  seatLabel?: string
  reason?: string
}
export type RecommendTipCardData = {
  tipType: 'conflict' | 'soldOut' | 'recommend' | 'info'
  title: string
  description: string
  recommendations?: RecommendItem[]
  action?: string
}

// 待支付卡片
export type PendingOrderCardData = {
  id: number
  movieName: string
  cinemaName: string
  seatInfo: string
  totalAmount: number
  remainingSeconds: number
}

// 统一卡片外层结构
export type CardPayload =
  | { type: 'movieList'; data: MovieListCardData }
  | { type: 'cinemaList'; data: CinemaListCardData }
  | { type: 'sessionList'; data: SessionListCardData }
  | { type: 'seatMap'; data: SeatMapCardData }
  | { type: 'orderConfirm'; data: OrderConfirmCardData }
  | { type: 'orderSuccess'; data: OrderSuccessCardData }
  | { type: 'recommendTip'; data: RecommendTipCardData }
  | { type: 'pendingOrder'; data: PendingOrderCardData }
  | { type: 'orderList'; data: OrderListCardData }
  | { type: 'routeInfo'; data: RouteInfoCardData }
  | { type: 'nearbyPoi'; data: NearbyPoiCardData }
  | { type: 'weatherInfo'; data: WeatherInfoCardData }

// 路线信息卡片
export interface RouteInfoCardData {
  code?: number
  data?: RouteData[]
  message?: string
}
export interface RouteData {
  distance: number
  duration: number
  steps?: Record<string, unknown>[]
}

// 周边POI卡片
export interface NearbyPoiCardData {
  code?: number
  data?: NearbyPoiItem[]
  message?: string
}
export interface NearbyPoiItem {
  id?: string
  name: string
  address?: string
  location?: string
  type?: string
  tel?: string
  distance?: string
}

// 天气信息卡片
export interface WeatherInfoCardData {
  code?: number
  data?: WeatherData
  message?: string
}
export interface WeatherData {
  city: string
  adcode?: string
  province?: string
  weather?: string
  temperature?: string
  windDirection?: string
  windPower?: string
  humidity?: string
  reportTime?: string
  casts?: WeatherCast[]
  forecasts?: WeatherCast[]
}
export interface WeatherCast {
  date: string
  week?: string
  dayweather: string
  nightweather?: string
  daytemp: string
  nighttemp?: string
  daywind?: string
  daypower?: string
}

// 卡片统一回调（点击选择后发送对话消息）
export type CardActionCallback = (userInputText: string) => void

// 卡片组件统一Props
export interface BaseCardProps<T> {
  data: T
  onAction: CardActionCallback
}

// ---- 本地消息类型 ----

export interface ChatMessage {
  msgId?: number
  role: 'user' | 'assistant'
  content: string
  cards: { cardType: string; cardData: unknown }[]
  pending?: boolean
}
