// ---------- API 层 ----------

/** 今日核心指标 */
export interface TodayStats {
  orderCount: number;
  transactionAmount: number;
  ticketCount: number;
  refundCount: number;
  conversionRate: number;
  avgTicketPrice: number;
  pendingCount: number;
  timeoutCancelRate: number;
}

/** 昨日同期对比 */
export interface YesterdayCompare {
  orderCountChange: number;
  transactionAmountChange: number;
  ticketCountChange: number;
}

/** 趋势数据点 */
export interface TrendItem {
  date: string;
  orderCount: number;
  transactionAmount: number;
}

/** 交易概览响应 */
export interface TransactionsResult {
  today: TodayStats;
  yesterdayCompare: YesterdayCompare;
  trend: TrendItem[];
}

/** 影片排行条目 */
export interface MovieRankingItem {
  movieName: string;
  ticketCount: number;
  boxOffice: number;
  orderCount: number;
  occupancyRate: number;
}

/** 影片排行响应 */
export interface MoviesRankingResult {
  ranking: MovieRankingItem[];
}

/** 影院运营分析条目 */
export interface CinemaAnalysisItem {
  cinemaName: string;
  orderCount: number;
  ticketCount: number;
  boxOffice: number;
  occupancyRate: number;
  refundRate: number;
  boxOfficeShare: number;
}

/** 影院运营分析响应 */
export interface CinemasAnalysisResult {
  cinemas: CinemaAnalysisItem[];
}

// ---------- Store 层 ----------

/** 仪表盘统计数据（Store / 页面展示用） */
export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  todayTickets: number;
  todayRefunds: number;
  conversionRate: number;
  avgOrderValue: number;
  pendingOrders: number;
  timeoutRate: number;
}

/** 趋势记录（Store / 页面展示用） */
export interface TrendRecord {
  date: string;
  orders: number;
  revenue: number;
}

/** 影片排名条目（Store / 页面展示用） */
export interface MovieRankItem {
  rank: number;
  name: string;
  type?: string;
  boxOffice: number;
  occupancy: number;
}

/** 影院运营行（Store / 页面展示用） */
export interface CinemaRow {
  name: string;
  branch?: string;
  dailyRevenue: number;
  occupancy: number;
}

/** 影院类型分布（Store / 页面展示用） */
export interface CinemaDistItem {
  name: string;
  value: number;
  count: number;
}

// ---------- 映射函数 ----------

/** TransactionsResult → DashboardStats */
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

/** TransactionsResult.trend → TrendRecord[] */
export function mapTrendData(res: TransactionsResult): TrendRecord[] {
  return res.trend.map((t) => ({
    date: t.date,
    orders: t.orderCount,
    revenue: t.transactionAmount,
  }));
}

/** MoviesRankingResult → MovieRankItem[] */
export function mapMovieRanking(res: MoviesRankingResult): MovieRankItem[] {
  return res.ranking.map((item, idx) => ({
    rank: idx + 1,
    name: item.movieName,
    boxOffice: item.boxOffice,
    occupancy: item.occupancyRate,
  }));
}

/** CinemasAnalysisResult → CinemaRow[] */
export function mapCinemasAnalysis(res: CinemasAnalysisResult): CinemaRow[] {
  return res.cinemas.map((c) => ({
    name: c.cinemaName,
    dailyRevenue: c.boxOffice,
    occupancy: c.occupancyRate,
  }));
}
