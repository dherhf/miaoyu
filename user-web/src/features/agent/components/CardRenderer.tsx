import { lazy, Suspense, type ComponentType } from 'react'
import type { CardActionCallback, CardType, BaseCardProps } from '../types'
import ErrorCardBoundary from './Cards/ErrorCardBoundary'

// 通用卡片组件类型：接收任意类型数据 + 交互回调
type CardComponent = ComponentType<BaseCardProps<any>>

// 使用 React.lazy 按需懒加载各个卡片组件，首屏不加载全部，减少打包体积
const MovieListCard = lazy(() => import('./Cards/MovieListCard'))          // 影片列表
const CinemaListCard = lazy(() => import('./Cards/CinemaListCard'))        // 影院列表
const SessionListCard = lazy(() => import('./Cards/SessionListCard'))      // 场次列表
const SeatMapCard = lazy(() => import('./Cards/SeatMapCard'))              // 座位图
const OrderConfirmCard = lazy(() => import('./Cards/OrderConfirmCard'))    // 订单确认
const OrderSuccessCard = lazy(() => import('./Cards/OrderSuccessCard'))    // 支付成功
const RecommendTipCard = lazy(() => import('./Cards/RecommendTipCard'))    // 推荐/异常提示
const PendingOrderCard = lazy(() => import('./Cards/PendingOrderCard'))    // 待支付订单
const OrderListCard = lazy(() => import('./Cards/OrderListCard'))          // 订单列表
const RouteInfoCard = lazy(() => import('./Cards/RouteInfoCard'))          // 路线规划
const NearbyPoiCard = lazy(() => import('./Cards/NearbyPoiCard'))          // 周边 POI
const WeatherInfoCard = lazy(() => import('./Cards/WeatherInfoCard'))      // 天气信息
const FallbackCard = lazy(() => import('./Cards/FallbackCard'))            // 未知类型兜底

// 卡片类型 -> 组件 的注册表，CardRenderer 据此查找对应组件渲染
const registry = new Map<CardType, CardComponent>([
  ['movieList', MovieListCard as CardComponent],
  ['cinemaList', CinemaListCard as CardComponent],
  ['sessionList', SessionListCard as CardComponent],
  ['seatMap', SeatMapCard as CardComponent],
  ['orderConfirm', OrderConfirmCard as CardComponent],
  ['orderSuccess', OrderSuccessCard as CardComponent],
  ['recommendTip', RecommendTipCard as CardComponent],
  ['pendingOrder', PendingOrderCard as CardComponent],
  ['orderList', OrderListCard as CardComponent],
  ['routeInfo', RouteInfoCard as CardComponent],
  ['nearbyPoi', NearbyPoiCard as CardComponent],
  ['weatherInfo', WeatherInfoCard as CardComponent],
])

/** CardRenderer 组件的 Props */
interface CardRendererProps {
  /** 后端下发的卡片类型（字符串，可能是 snake_case，如 movie_list） */
  cardType: string
  /** 卡片原始数据载荷 */
  cardData: unknown
  /** 卡片交互回调（点击选项后发送对话消息） */
  onAction: CardActionCallback
}

/**
 * 将 snake_case 转为 camelCase（如 movie_list → movieList）。
 * 后端下发的类型可能是下划线形式，需转成注册表中的驼峰键。
 * @param s 原始字符串
 * @returns 转化后的驼峰字符串
 */
function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * 卡片统一渲染器：根据 cardType 从注册表找到对应卡片组件并渲染。
 * 未知类型使用 FallbackCard 兜底展示原始数据；渲染过程中用 ErrorCardBoundary
 * 捕获异常、Suspense 提供懒加载占位。
 */
export default function CardRenderer({ cardType, cardData, onAction }: CardRendererProps) {
  // 规范化类型名（snake_case → camelCase）
  const normalized = toCamelCase(cardType) as CardType
  // 从注册表查找对应组件；查不到时回退为 FallbackCard
  const Component = registry.get(normalized) ?? FallbackCard as CardComponent

  return (
    <div className="mt-1.5">
      <ErrorCardBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-6 text-muted text-sm">
              加载中...
            </div>
          }
        >
          <Component data={cardData} onAction={onAction} />
        </Suspense>
      </ErrorCardBoundary>
    </div>
  )
}