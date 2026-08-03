import { useSyncExternalStore } from 'react';
import type { OrderStatus, OrderSeat, OrderItem } from './types';
import { mockOrders } from './mock';

export type { OrderStatus, OrderSeat, OrderItem } from './types';

interface OrderState {
  orders: OrderItem[];
}

// ===================== 模块级状态 =====================
let state: OrderState = { orders: mockOrders };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ===================== Store Hook =====================
export function useOrderStore() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

  return {
    orders: snapshot.orders,

    getOrderById: (id: number): OrderItem | undefined => {
      return snapshot.orders.find((o) => o.id === id);
    },

    getOrdersBySchedule: (scheduleId: number): OrderItem[] => {
      return snapshot.orders.filter((o) => o.scheduleId === scheduleId);
    },
  };
}
