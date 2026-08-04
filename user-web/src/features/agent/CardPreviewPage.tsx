import { Suspense } from 'react'
import MovieListCard from './components/Cards/MovieListCard'
import CinemaListCard from './components/Cards/CinemaListCard'
import SessionListCard from './components/Cards/SessionListCard'
import SeatMapCard from './components/Cards/SeatMapCard'
import OrderConfirmCard from './components/Cards/OrderConfirmCard'
import OrderSuccessCard from './components/Cards/OrderSuccessCard'
import RecommendTipCard from './components/Cards/RecommendTipCard'
import PendingOrderCard from './components/Cards/PendingOrderCard'
import OrderListCard from './components/Cards/OrderListCard'
import FallbackCard from './components/Cards/FallbackCard'
import ErrorCardBoundary from './components/Cards/ErrorCardBoundary'
import type { CardActionCallback } from './types'
import type {
  MovieListCardData,
  CinemaListCardData,
  SessionListCardData,
  SeatMapCardData,
  OrderConfirmCardData,
  OrderSuccessCardData,
  RecommendTipCardData,
  PendingOrderCardData,
  OrderListCardData,
} from './types'

// ---------- mock 数据 ----------

const mockMovieList: MovieListCardData = {
  movies: [
    { id: 1, name: '流浪地球3', posterUrl: '', rating: 9.2, types: ['科幻', '冒险', '剧情'], duration: 173 },
    { id: 2, name: '哪吒之魔童闹海', posterUrl: '', rating: 8.8, types: ['动画', '奇幻'], duration: 144 },
    { id: 3, name: '封神第二部', posterUrl: '', rating: 8.1, types: ['奇幻', '动作', '战争'], duration: 150 },
    { id: 4, name: '热辣滚烫', posterUrl: '', rating: 7.6, types: ['喜剧', '运动'], duration: 129 },
    { id: 5, name: '飞驰人生2', posterUrl: '', rating: 7.9, types: ['喜剧', '运动'], duration: 121 },
  ],
}

const mockCinemaList: CinemaListCardData = {
  cinemas: [
    { id: 1, name: '万达影城（天河店）', address: '天河路228号正佳广场7楼', distance: '1.2km', rating: 4.8, facilities: ['IMAX', '杜比全景声', 'VIP厅', '停车'] },
    { id: 2, name: 'CGV影城（珠江新城店）', address: '花城大道89号花城汇B1', distance: '2.5km', rating: 4.6, facilities: ['4DX', 'ScreenX', '停车'] },
    { id: 3, name: '金逸影城（北京路店）', address: '北京路168号粤海仰忠汇6楼', distance: '3.8km', rating: 4.5, facilities: ['IMAX', '停车'] },
  ],
}

const mockSessionList: SessionListCardData = {
  sessions: [
    { id: 101, cinemaName: '万达影城（天河店）', showDate: '2026-08-05', startTime: '14:30', endTime: '17:23', hallName: 'IMAX厅', languageVersion: '国语3D', price: 79, availableSeats: 86 },
    { id: 102, cinemaName: '万达影城（天河店）', showDate: '2026-08-05', startTime: '16:00', endTime: '18:53', hallName: '5号激光厅', languageVersion: '国语2D', price: 59, availableSeats: 45 },
    { id: 103, cinemaName: '万达影城（天河店）', showDate: '2026-08-05', startTime: '19:30', endTime: '22:23', hallName: 'IMAX厅', languageVersion: '国语3D', price: 99, availableSeats: 12 },
    { id: 104, cinemaName: 'CGV影城（珠江新城店）', showDate: '2026-08-05', startTime: '15:00', endTime: '17:53', hallName: '4DX厅', languageVersion: '国语2D', price: 89, availableSeats: 33 },
  ],
}

const mockSeatMap: SeatMapCardData = {
  sessionId: 101,
  totalRows: 7,
  totalCols: 12,
  availableSeats: 62,
  price: 79,
  seats: buildSeatGrid(7, 12),
}

function buildSeatGrid(rows: number, cols: number): SeatMapCardData['seats'] {
  const seats: SeatMapCardData['seats'] = []
  let idx = 0
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      // 留出过道（中间两列）
      if (c === 6 || c === 7) continue
      const statuses: Array<'available' | 'locked' | 'sold'> = ['available', 'available', 'available', 'available', 'available', 'locked', 'sold']
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const cat: 'regular' | 'vip' | 'couple' = r <= 1 ? 'vip' : r >= 6 ? 'couple' : 'regular'
      seats.push({
        seatIndex: idx++,
        rowIndex: r,
        colIndex: c,
        seatLabel: `${r}排${c}座`,
        seatCategory: cat,
        status,
      })
    }
  }
  return seats
}

const mockOrderConfirm: OrderConfirmCardData = {
  id: 20240801001,
  status: 'pending',
  movieName: '流浪地球3',
  cinemaName: '万达影城（天河店）',
  hallName: 'IMAX厅',
  showDate: '2026-08-05',
  startTime: '14:30',
  seatInfo: '5排3座, 5排4座',
  ticketCount: 2,
  totalAmount: 158,
  orderNo: 'MY202408051430001',
  remainingTime: 785,
  expireAt: new Date(Date.now() + 785 * 1000).toISOString(),
}

const mockOrderSuccess: OrderSuccessCardData = {
  pickupCode: '8723 5619',
  movieName: '流浪地球3',
  cinemaName: '万达影城（天河店）',
  cinemaAddress: '天河路228号正佳广场7楼',
  hallName: 'IMAX厅',
  showDate: '2026-08-05',
  startTime: '14:30',
  seatInfo: '5排3座, 5排4座',
  totalAmount: 158,
  orderNo: 'MY202408051430001',
}

const mockRecommendTip: RecommendTipCardData = {
  tipType: 'recommend',
  title: '为您推荐更佳位置',
  description: '5排3座、5排4座已被锁定，系统为您推荐以下更佳观影位置：',
  recommendations: [
    { seatLabel: '6排5座', reason: '正对银幕中央，观影角度最佳' },
    { seatLabel: '6排6座', reason: '与6排5座相邻，适合双人观影' },
    { seatLabel: '7排5座', reason: '稍靠后，IMAX厅后排视野更完整' },
  ],
  action: '接受推荐',
}

const mockSoldOutTip: RecommendTipCardData = {
  tipType: 'soldOut',
  title: '该场次已售罄',
  description: '抱歉，8月5日《流浪地球3》IMAX厅 14:30 场次已全部售罄。建议您选择其他场次或影片。',
  recommendations: [
    { reason: '换个场次：同影院 16:00 / 19:30 仍有座位' },
    { reason: '换家影院：CGV影城 15:00 4DX厅可选座' },
  ],
}

const mockPendingOrder: PendingOrderCardData = {
  id: 20240801002,
  movieName: '封神第二部',
  cinemaName: 'CGV影城（珠江新城店）',
  seatInfo: '8排10座, 8排11座',
  totalAmount: 178,
  remainingSeconds: 422,
}

const mockOrderList: OrderListCardData = {
  total: 4,
  orders: [
    {
      id: 501, orderNo: 'MY202408051430001', status: 'pending',
      movieName: '流浪地球3', cinemaName: '万达影城（天河店）',
      showDate: '2026-08-05', startTime: '14:30', seatInfo: '5排3座, 5排4座',
      ticketCount: 2, totalAmount: 158,
      createdAt: '2026-08-05T12:00:00Z',
    },
    {
      id: 502, orderNo: 'MY202408031930001', status: 'paid',
      movieName: '哪吒之魔童闹海', cinemaName: 'CGV影城（珠江新城店）',
      showDate: '2026-08-03', startTime: '19:30', seatInfo: '8排10座, 8排11座',
      ticketCount: 2, totalAmount: 178,
      createdAt: '2026-08-03T18:45:00Z',
    },
    {
      id: 503, orderNo: 'MY202408021500001', status: 'cancelled',
      movieName: '封神第二部', cinemaName: '金逸影城（北京路店）',
      showDate: '2026-08-02', startTime: '15:00', seatInfo: '3排7座',
      ticketCount: 1, totalAmount: 69,
      createdAt: '2026-08-02T10:30:00Z',
    },
    {
      id: 504, orderNo: 'MY202407301800001', status: 'refunded',
      movieName: '飞驰人生2', cinemaName: '万达影城（天河店）',
      showDate: '2026-07-30', startTime: '18:00', seatInfo: '10排12座, 10排13座',
      ticketCount: 2, totalAmount: 118,
      createdAt: '2026-07-30T12:00:00Z',
    },
  ],
}

// ---------- noop callback ----------

const noop: CardActionCallback = (text) => {
  console.log('[CardPreview] onAction:', text)
}

// ---------- 页面布局 ----------

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#f3f4f6',
  fontSize: 14,
  fontWeight: 700,
  color: '#374151',
  borderBottom: '1px solid #e5e7eb',
}

export default function CardPreviewPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>🎨 卡片预览 Mock 页</h1>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px' }}>
        展示全部 9 种卡片组件，无需登录、无需后端
      </p>

      <CardSection title="MovieListCard — 影片列表" anchor="movieList">
        <MovieListCard data={mockMovieList} onAction={noop} />
      </CardSection>

      <CardSection title="CinemaListCard — 影院列表" anchor="cinemaList">
        <CinemaListCard data={mockCinemaList} onAction={noop} />
      </CardSection>

      <CardSection title="SessionListCard — 场次列表" anchor="sessionList">
        <SessionListCard data={mockSessionList} onAction={noop} />
      </CardSection>

      <CardSection title="SeatMapCard — 座位图" anchor="seatMap">
        <SeatMapCard data={mockSeatMap} onAction={noop} />
      </CardSection>

      <CardSection title="OrderConfirmCard — 订单确认（pending）" anchor="orderConfirm">
        <OrderConfirmCard data={mockOrderConfirm} onAction={noop} />
      </CardSection>

      <CardSection title="OrderSuccessCard — 支付成功" anchor="orderSuccess">
        <OrderSuccessCard data={mockOrderSuccess} onAction={noop} />
      </CardSection>

      <CardSection title="RecommendTipCard — 推荐建议" anchor="recommendTip">
        <RecommendTipCard data={mockRecommendTip} onAction={noop} />
      </CardSection>

      <CardSection title="RecommendTipCard — 售罄提示" anchor="soldOutTip">
        <RecommendTipCard data={mockSoldOutTip} onAction={noop} />
      </CardSection>

      <CardSection title="PendingOrderCard — 待支付浮层" anchor="pendingOrder">
        <PendingOrderCard data={mockPendingOrder} onAction={noop} />
      </CardSection>

      <CardSection title="OrderListCard — 订单查询列表" anchor="orderList">
        <OrderListCard data={mockOrderList} onAction={noop} />
      </CardSection>

      <CardSection title="FallbackCard — 未知卡片类型兜底" anchor="fallback">
        <FallbackCard data={{ foo: 'bar', items: [1, 2, 3] }} onAction={noop} />
      </CardSection>
    </div>
  )
}

function CardSection({ title, children }: { title: string; anchor: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>{title}</div>
      <div style={{ padding: 12 }}>
        <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>加载中...</div>}>
          <ErrorCardBoundary>
            {children}
          </ErrorCardBoundary>
        </Suspense>
      </div>
    </section>
  )
}
