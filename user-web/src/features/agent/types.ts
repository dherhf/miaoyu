// ---- 请求 / 响应类型 ----

/** 创建会话的请求体类型 */
export interface CreateSessionRequest {
  /** 会话标题（可选，留空则由后端按首条消息自动生成） */
  title?: string
}

/** 创建会话的响应类型 */
export interface CreateSessionResponse {
  /** 新建会话的唯一 ID */
  sessionId: string
  /** 会话标题 */
  title: string
  /** 会话状态（如 active 等） */
  status: string
  /** 槽位状态（意图槽位填充信息，通常由后端维护） */
  slotState: unknown
  /** 创建时间 */
  createdAt: string
}

/** 发送对话消息的请求体类型 */
export interface SendMessageRequest {
  /** 用户输入的文本内容 */
  content: string
  /** 请求唯一标识，用于追踪与去重 */
  requestId?: string
  /** 用户当前经度（GCJ-02，由前端高德定位提供） */
  longitude?: number
  /** 用户当前纬度（GCJ-02） */
  latitude?: number
  /** 用户当前城市 */
  city?: string
}

/** 会话列表中的单条会话摘要 */
export interface SessionSummary {
  /** 会话 ID */
  sessionId: string
  /** 会话标题 */
  title: string
  /** 会话状态 */
  status: string
  /** 最后一条消息时间 */
  lastMessageAt: string
  /** 创建时间 */
  createdAt: string
}

/** 会话列表接口的响应类型 */
export interface SessionListResponse {
  /** 会话总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页条数 */
  size: number
  /** 会话摘要记录数组 */
  records: SessionSummary[]
}

/** 历史消息记录项（来自消息列表） */
export interface MessageItem {
  /** 消息 ID */
  msgId: number
  /** 消息角色：user 用户 / assistant 助手 */
  role: string
  /** 消息文本内容 */
  content: string
  /** 关联的卡片类型（无卡片时为 null） */
  cardType: string | null
  /** 卡片数据载荷 */
  cardData: unknown
  /** 消息意图（如选座、购票等，可选） */
  intent: string | null
  /** 意图槽位数据 */
  slots: unknown
  /** 消息创建时间 */
  createdAt: string
}

/** 会话详情接口的响应类型 */
export interface SessionDetailResponse {
  /** 会话 ID */
  sessionId: string
  /** 会话标题 */
  title: string
  /** 会话状态 */
  status: string
  /** 槽位状态 */
  slotState: unknown
  /** 创建时间 */
  createdAt: string
  /** 历史消息列表 */
  messages: MessageItem[]
}

// ---- SSE 事件类型 ----

/** SSE 流式消息事件：文本增量内容 */
export interface SseMessageEvent {
  content: string
}

/** SSE 卡片事件：携带卡片类型与数据，用于渲染交互卡片 */
export interface SseCardEvent {
  cardType: string
  cardData: unknown
}

/** SSE 完成事件：一条完整回复结束时触发 */
export interface SseDoneEvent {
  sessionId: string
  intent: string
  slots: unknown
  title?: string
}

/** SSE 错误事件 */
export interface SseErrorEvent {
  code: string | number
  message: string
}

/** SSE 事件回调集合，由调用方实现各事件的 UI 处理逻辑 */
export interface SseCallbacks {
  /** 收到文本增量时回调 */
  onMessage: (event: SseMessageEvent) => void
  /** 收到卡片时回调 */
  onCard: (event: SseCardEvent) => void
  /** 收到完成事件时回调 */
  onDone: (event: SseDoneEvent) => void
  /** 收到错误时回调 */
  onError: (event: SseErrorEvent) => void
}

// ---- 卡片类型 ----

/** 所有支持的 agent 卡片类型联合 */
export type CardType =
  | 'movieList'      // 影片列表
  | 'cinemaList'     // 影院列表
  | 'sessionList'    // 场次列表
  | 'seatMap'        // 座位图
  | 'orderConfirm'   // 订单确认
  | 'orderSuccess'   // 支付成功
  | 'recommendTip'   // 推荐/异常提示
  | 'pendingOrder'   // 待支付订单
  | 'orderList'      // 订单列表
  | 'routeInfo'      // 路线规划
  | 'nearbyPoi'      // 周边 POI
  | 'weatherInfo'    // 天气信息

// 影片卡片数据
/** 单个影片信息 */
export interface MovieItem {
  /** 影片 ID */
  id: number
  /** 影片名称 */
  name: string
  /** 海报图片地址 */
  posterUrl: string
  /** 评分（可选，0 表示无评分） */
  rating?: number
  /** 影片类型标签（如 动作、喜剧） */
  types?: string[]
  /** 片长（分钟） */
  duration?: number
}
/** 影片列表卡片数据 */
export type MovieListCardData = { records: MovieItem[]; total?: number }

// 影院卡片数据
/** 单个影院信息 */
export interface CinemaItem {
  /** 影院 ID */
  id: number
  /** 影院名称 */
  name: string
  /** 影院地址 */
  address?: string
  /** 距用户距离（文本） */
  distance?: string
  /** 影院设施列表（如 IMAX、杜比） */
  facilities?: string[]
  /** 评分 */
  rating?: number
}
/** 影院列表卡片数据 */
export type CinemaListCardData = { records: CinemaItem[]; total?: number }

// 场次卡片
/** 单个电影场次信息 */
export interface SessionItem {
  /** 场次 ID */
  id: number
  /** 所属影院名称 */
  cinemaName: string
  /** 放映日期（YYYY-MM-DD） */
  showDate: string
  /** 开演时间（HH:mm） */
  startTime: string
  /** 散场时间（HH:mm） */
  endTime: string
  /** 影厅名称 */
  hallName: string
  /** 语言/版本（如 国语2D、英语3D） */
  languageVersion: string
  /** 票价 */
  price: number
  /** 剩余可选座位数 */
  availableSeats: number
}
/** 场次列表卡片数据 */
export type SessionListCardData = { records: SessionItem[]; total?: number }

// 座位卡片
/** 单个座位的状态与位置信息 */
export interface Seat {
  /** 座位唯一索引 */
  seatIndex: number
  /** 所在行索引（从 1 开始） */
  rowIndex: number
  /** 所在列索引（从 1 开始） */
  colIndex: number
  /** 座位标签（如 5排6座） */
  seatLabel: string
  /** 座位类别：普通 / VIP / 情侣 / 无障碍 */
  seatCategory: 'regular' | 'vip' | 'couple' | 'wheelchair'
  /** 座位状态：可选 / 已锁定 / 已售 */
  status: 'available' | 'locked' | 'sold'
}
/** 座位图卡片数据 */
export type SeatMapCardData = {
  /** 场次 ID */
  sessionId: number
  /** 座位总行数 */
  totalRows: number
  /** 座位总列数 */
  totalCols: number
  /** 可选座位总数 */
  availableSeats: number
  /** 单座票价 */
  price: number
  /** 座位数组 */
  seats: Seat[]
}

// 订单确认卡片
/** 订单确认卡片数据（下单后等待支付的订单） */
export type OrderConfirmCardData = {
  /** 订单 ID */
  id: number
  /** 订单状态：待支付 / 已支付 / 已取消 */
  status: 'pending' | 'paid' | 'cancelled'
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开演时间 */
  startTime: string
  /** 座位信息文本（如 5排6座,5排7座） */
  seatInfo: string
  /** 票数 */
  ticketCount: number
  /** 订单总金额 */
  totalAmount: number
  /** 订单编号 */
  orderNo: string
  /** 剩余支付时间（秒） */
  remainingTime: number
  /** 订单过期时间 */
  expireAt: string
}

// 支付成功卡片
/** 支付成功卡片数据（展示取票码与订单详情） */
export type OrderSuccessCardData = {
  /** 取票码 */
  pickupCode: string
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 影院地址 */
  cinemaAddress: string
  /** 影厅名称 */
  hallName: string
  /** 放映日期 */
  showDate: string
  /** 开演时间 */
  startTime: string
  /** 座位信息 */
  seatInfo: string
  /** 订单总金额 */
  totalAmount: number
  /** 订单编号 */
  orderNo: string
}

// 订单查询列表
/** 订单列表中的单个订单 */
export interface OrderItem {
  /** 订单 ID */
  id: number
  /** 订单编号 */
  orderNo: string
  /** 订单状态：待支付/已出票/已检票/已取消/已退票 */
  status: 'pending' | 'paid' | 'checked' | 'cancelled' | 'refunded'
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 放映日期 */
  showDate: string
  /** 开演时间 */
  startTime: string
  /** 座位信息 */
  seatInfo: string
  /** 票数 */
  ticketCount: number
  /** 订单总金额 */
  totalAmount: number
  /** 下单时间 */
  createdAt: string
  /** 待支付剩余秒数（仅待支付订单有） */
  remainingSeconds?: number
}
/** 订单列表卡片数据 */
export type OrderListCardData = {
  records: OrderItem[]
  total?: number
  page?: number
  size?: number
}

// 推荐/异常卡片
/** 推荐项（推荐座位或场次） */
export interface RecommendItem {
  /** 推荐座位标签（座位推荐时） */
  seatLabel?: string
  /** 推荐原因说明 */
  reason?: string
}
/** 推荐/异常提示卡片数据 */
export type RecommendTipCardData = {
  /** 提示类型：座位冲突/售罄/推荐/信息 */
  tipType: 'conflict' | 'soldOut' | 'recommend' | 'info'
  /** 标题 */
  title: string
  /** 描述文本 */
  description: string
  /** 推荐列表（可选的替代座位/场次） */
  recommendations?: RecommendItem[]
  /** 底部操作按钮文本（点击后作为消息发送） */
  action?: string
}

// 待支付卡片
/** 待支付订单卡片数据（会话中出现待支付订单时的快捷支付提醒） */
export type PendingOrderCardData = {
  /** 订单 ID */
  id: number
  /** 影片名称 */
  movieName: string
  /** 影院名称 */
  cinemaName: string
  /** 座位信息 */
  seatInfo: string
  /** 订单总金额 */
  totalAmount: number
  /** 剩余支付秒数 */
  remainingSeconds: number
}

// 统一卡片外层结构
/** 统一卡片载荷：每类卡片由 type 标识其类型，data 携带对应类型的数据 */
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
/** 路线规划卡片数据（由高德 API 返回） */
export interface RouteInfoCardData {
  /** 状态码（200 表示成功） */
  code?: number
  /** 路线数据 */
  data?: RouteData[]
  /** 提示信息 */
  message?: string
}
/** 单条路线数据 */
export interface RouteData {
  /** 距离（米） */
  distance: number
  /** 耗时（秒） */
  duration: number
  /** 详细步骤（可选） */
  steps?: Record<string, unknown>[]
}

// 周边POI卡片
/** 周边 POI 卡片数据（高德周边搜索） */
export interface NearbyPoiCardData {
  /** 状态码 */
  code?: number
  /** POI 列表 */
  data?: NearbyPoiItem[]
  /** 提示信息 */
  message?: string
}
/** 单个周边 POI 点 */
export interface NearbyPoiItem {
  /** POI 唯一 ID */
  id?: string
  /** 名称（如 餐厅名、影院名） */
  name: string
  /** 地址 */
  address?: string
  /** 经纬度（"经度,纬度"） */
  location?: string
  /** POI 类型 */
  type?: string
  /** 联系电话 */
  tel?: string
  /** 距用户距离 */
  distance?: string
}

// 天气信息卡片
/** 天气信息卡片数据（高德天气查询） */
export interface WeatherInfoCardData {
  /** 状态码 */
  code?: number
  /** 天气数据 */
  data?: WeatherData
  /** 提示信息 */
  message?: string
}
/** 天气数据（实时 + 预报） */
export interface WeatherData {
  /** 城市名称 */
  city: string
  /** 区域编码 */
  adcode?: string
  /** 省份 */
  province?: string
  /** 天气现象（如 晴、多云） */
  weather?: string
  /** 实时温度 */
  temperature?: string
  /** 风向 */
  windDirection?: string
  /** 风力等级 */
  windPower?: string
  /** 湿度百分比 */
  humidity?: string
  /** 数据发布时间 */
  reportTime?: string
  /** 天气预报列表（casts/forecasts 二选一） */
  casts?: WeatherCast[]
  forecasts?: WeatherCast[]
}
/** 单日天气预报 */
export interface WeatherCast {
  /** 日期（YYYY-MM-DD） */
  date: string
  /** 星期 */
  week?: string
  /** 白天天气 */
  dayweather: string
  /** 夜间天气 */
  nightweather?: string
  /** 白天温度 */
  daytemp: string
  /** 夜间温度 */
  nighttemp?: string
  /** 白天风向 */
  daywind?: string
  /** 白天风力 */
  daypower?: string
}

// 卡片统一回调（点击选择后发送对话消息）
/** 卡片交互回调：用户点击卡片上的选项时，把意图文本作为新消息发送给对话 */
export type CardActionCallback = (userInputText: string) => void

// 卡片组件统一Props
/** 所有卡片组件的统一 Props：接收卡片数据与交互回调 */
export interface BaseCardProps<T> {
  data: T
  onAction: CardActionCallback
}

// ---- 本地消息类型 ----

/** 聊天界面本地使用的消息结构（含文本与卡片列表） */
export interface ChatMessage {
  /** 消息 ID（本地新消息可能没有） */
  msgId?: number
  /** 角色：user 用户 / assistant 助手 */
  role: 'user' | 'assistant'
  /** 消息文本内容 */
  content: string
  /** 消息关联的卡片列表 */
  cards: { cardType: string; cardData: unknown }[]
  /** 是否处于流式生成中（用于显示打字中动画） */
  pending?: boolean
}