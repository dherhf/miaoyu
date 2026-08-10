// ===================== 数据看板相关类型 =====================

// ---------- API 层（与后端接口直接对应的类型）----------

/** 今日核心指标（API 返回） */
export interface TodayStats {
  /** 今日订单数 */
  orderCount: number;
  /** 今日交易额（分） */
  transactionAmount: number;
  /** 今日出票量 */
  ticketCount: number;
  /** 今日退票量 */
  refundCount: number;
  /** 订单转化率 */
  conversionRate: number;
  /** 平均客单价（分） */
  avgTicketPrice: number;
  /** 待支付订单数 */
  pendingCount: number;
  /** 超时取消率 */
  timeoutCancelRate: number;
}

/** 昨日同期对比数据 */
export interface YesterdayCompare {
  /** 订单数变化（正数=增长，负数=下降） */
  orderCountChange: number;
  /** 交易额变化 */
  transactionAmountChange: number;
  /** 出票量变化 */
  ticketCountChange: number;
  /** 退票量变化 */
  refundCountChange: number;
}

/** 趋势数据点（单日） */
export interface TrendItem {
  /** 日期（如 "2026-08-01"） */
  date: string;
  /** 当日订单数 */
  orderCount: number;
  /** 当日交易额 */
  transactionAmount: number;
}

/** 交易概览响应（包含今日指标、昨日对比和趋势数据） */
export interface TransactionsResult {
  /** 今日核心指标 */
  today: TodayStats;
  /** 昨日同期对比 */
  yesterdayCompare: YesterdayCompare;
  /** 趋势数据列表 */
  trend: TrendItem[];
}

/** 影片排行条目（后端直接返回 List，非包装对象） */
export interface MovieRankingItem {
  /** 影片名称 */
  movieName: string;
  /** 票数 */
  ticketCount: number;
  /** 票房 */
  boxOffice: number;
  /** 订单数 */
  orderCount: number;
  /** 上座率 */
  occupancyRate: number;
}

/** 影院运营分析条目（后端直接返回 List，非包装对象） */
export interface CinemaAnalysisItem {
  /** 影院名称 */
  cinemaName: string;
  /** 订单数 */
  orderCount: number;
  /** 票数 */
  ticketCount: number;
  /** 票房 */
  boxOffice: number;
  /** 上座率 */
  occupancyRate: number;
  /** 退票率 */
  refundRate: number;
  /** 票房占比 */
  boxOfficeShare: number;
}

// ---------- Store 层（前端展示用类型）----------

/** 仪表盘统计数据（Store / 页面展示用） */
export interface DashboardStats {
  /** 今日订单总数 */
  todayOrders: number;
  /** 今日交易额 */
  todayRevenue: number;
  /** 今日出票量 */
  todayTickets: number;
  /** 今日退票量 */
  todayRefunds: number;
  /** 订单转化率 */
  conversionRate: number;
  /** 平均客单价 */
  avgOrderValue: number;
  /** 待支付订单数 */
  pendingOrders: number;
  /** 超时取消率 */
  timeoutRate: number;
}

/** 趋势记录（Store / 页面展示用） */
export interface TrendRecord {
  /** 日期 */
  date: string;
  /** 订单量 */
  orders: number;
  /** 交易额 */
  revenue: number;
}

/** 影片排名条目（Store / 页面展示用） */
export interface MovieRankItem {
  /** 排名（1-based） */
  rank: number;
  /** 影片名称 */
  movieName: string;
  /** 票数 */
  ticketCount: number;
  /** 票房 */
  boxOffice: number;
  /** 订单数 */
  orderCount: number;
}

/** 影院运营行（Store / 页面展示用） */
export interface CinemaRow {
  /** 影院名称 */
  cinemaName: string;
  /** 订单数 */
  orderCount: number;
  /** 票数 */
  ticketCount: number;
  /** 票房 */
  boxOffice: number;
  /** 退票率 */
  refundRate: number;
  /** 票房占比 */
  boxOfficeShare: number;
}

// ---------- 映射函数（API 类型 ↔ Store 类型转换）----------

/**
 * TransactionsResult → DashboardStats
 * 将 API 返回的今日指标映射为前端展示格式
 */
export function mapDashboardStats(res: TransactionsResult): DashboardStats {
  return {
    todayOrders: res.today.orderCount,
    todayRevenue: res.today.transactionAmount,
    todayTickets: res.today.ticketCount,
    todayRefunds: res.today.refundCount,
    conversionRate: res.today.conversionRate,
    avgOrderValue: res.today.avgTicketPrice,
    pendingOrders: res.today.pendingCount,
    timeoutRate: res.today.timeoutCancelRate,
  };
}

/**
 * TransactionsResult.trend → TrendRecord[]
 * 将 API 趋势数据映射为前端图表格式
 */
export function mapTrendData(res: TransactionsResult): TrendRecord[] {
  return res.trend.map((t) => ({
    date: t.date,
    orders: t.orderCount,
    revenue: t.transactionAmount,
  }));
}

/**
 * MovieRankingItem[] → MovieRankItem[]
 * 映射影片排行数据，并自动添加排名序号
 */
export function mapMovieRanking(items: MovieRankingItem[]): MovieRankItem[] {
  return items.map((item, idx) => ({
    rank: idx + 1,
    movieName: item.movieName,
    ticketCount: item.ticketCount,
    boxOffice: item.boxOffice,
    orderCount: item.orderCount,
  }));
}

/**
 * CinemaAnalysisItem[] → CinemaRow[]
 * 映射影院运营分析数据为前端展示格式
 */
export function mapCinemasAnalysis(items: CinemaAnalysisItem[]): CinemaRow[] {
  return items.map((c) => ({
    cinemaName: c.cinemaName,
    orderCount: c.orderCount,
    ticketCount: c.ticketCount,
    boxOffice: c.boxOffice,
    refundRate: c.refundRate,
    boxOfficeShare: c.boxOfficeShare,
  }));
}
