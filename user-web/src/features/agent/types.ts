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
  sessionId?: string
  ticketCount?: number
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

// ---- 卡片数据类型 ----

export interface MovieCardData {
  id: string
  name: string
  posterUrl: string
  rating: number
  types: string[]
  duration: number
}

export interface CinemaCardData {
  id: string
  name: string
  address: string
  distance: string
  facilities: string[]
  rating: number
}

export interface SessionCardData {
  id: string
  showDate: string
  startTime: string
  endTime: string
  hallName: string
  languageVersion: string
  price: number
  availableSeats: number
}

// ---- 本地消息类型 ----

export interface ChatMessage {
  msgId?: number
  role: 'user' | 'assistant'
  content: string
  cardType?: string | null
  cardData?: unknown
  pending?: boolean
}
