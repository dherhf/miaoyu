import { lazy, type ComponentType } from 'react'
import type { CardType, BaseCardProps, CardPayload } from './types'

type CardComponent = ComponentType<BaseCardProps<any>>

const registry = new Map<CardType, CardComponent>()

// 懒加载所有卡片组件
const MovieListCard = lazy(() => import('./components/Cards/MovieListCard'))
const CinemaListCard = lazy(() => import('./components/Cards/CinemaListCard'))
const SessionListCard = lazy(() => import('./components/Cards/SessionListCard'))
const SeatMapCard = lazy(() => import('./components/Cards/SeatMapCard'))
const OrderConfirmCard = lazy(() => import('./components/Cards/OrderConfirmCard'))
const OrderSuccessCard = lazy(() => import('./components/Cards/OrderSuccessCard'))
const RecommendTipCard = lazy(() => import('./components/Cards/RecommendTipCard'))
const PendingOrderCard = lazy(() => import('./components/Cards/PendingOrderCard'))
const OrderListCard = lazy(() => import('./components/Cards/OrderListCard'))
const FallbackCard = lazy(() => import('./components/Cards/FallbackCard'))

registry.set('movieList', MovieListCard)
registry.set('cinemaList', CinemaListCard)
registry.set('sessionList', SessionListCard)
registry.set('seatMap', SeatMapCard)
registry.set('orderConfirm', OrderConfirmCard)
registry.set('orderSuccess', OrderSuccessCard)
registry.set('recommendTip', RecommendTipCard)
registry.set('pendingOrder', PendingOrderCard)
registry.set('orderList', OrderListCard)

/** 根据 cardType 获取对应组件，未注册则返回 FallbackCard */
export function getCardComponent(type: CardType): CardComponent {
  return registry.get(type) ?? FallbackCard
}

/** 获取卡片渲染所需的 props */
export function getCardProps(payload: CardPayload): { data: unknown } {
  return { data: payload.data }
}
