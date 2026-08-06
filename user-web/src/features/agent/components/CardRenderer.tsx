import { lazy, Suspense, type ComponentType } from 'react'
import type { CardActionCallback, CardType, BaseCardProps } from '../types'
import ErrorCardBoundary from './Cards/ErrorCardBoundary'

type CardComponent = ComponentType<BaseCardProps<any>>

const MovieListCard = lazy(() => import('./Cards/MovieListCard'))
const CinemaListCard = lazy(() => import('./Cards/CinemaListCard'))
const SessionListCard = lazy(() => import('./Cards/SessionListCard'))
const SeatMapCard = lazy(() => import('./Cards/SeatMapCard'))
const OrderConfirmCard = lazy(() => import('./Cards/OrderConfirmCard'))
const OrderSuccessCard = lazy(() => import('./Cards/OrderSuccessCard'))
const RecommendTipCard = lazy(() => import('./Cards/RecommendTipCard'))
const PendingOrderCard = lazy(() => import('./Cards/PendingOrderCard'))
const OrderListCard = lazy(() => import('./Cards/OrderListCard'))
const RouteInfoCard = lazy(() => import('./Cards/RouteInfoCard'))
const NearbyPoiCard = lazy(() => import('./Cards/NearbyPoiCard'))
const WeatherInfoCard = lazy(() => import('./Cards/WeatherInfoCard'))
const FallbackCard = lazy(() => import('./Cards/FallbackCard'))

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

interface CardRendererProps {
  cardType: string
  cardData: unknown
  onAction: CardActionCallback
}

/** 将 snake_case 转为 camelCase（如 movie_list → movieList） */
function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export default function CardRenderer({ cardType, cardData, onAction }: CardRendererProps) {
  const normalized = toCamelCase(cardType) as CardType
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
