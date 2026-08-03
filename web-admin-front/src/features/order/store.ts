import { create } from 'zustand';
import type { OrderItem } from './types';
import { mockOrders } from './mock';

export type { OrderStatus, OrderSeat, OrderItem } from './types';

interface OrderState {
  orders: OrderItem[];
  getOrderById: (id: number) => OrderItem | undefined;
  getOrdersBySchedule: (scheduleId: number) => OrderItem[];
}

export const useOrderStore = create<OrderState>((_, get) => ({
  orders: mockOrders,

  getOrderById: (id: number): OrderItem | undefined => {
    return get().orders.find((o) => o.id === id);
  },

  getOrdersBySchedule: (scheduleId: number): OrderItem[] => {
    return get().orders.filter((o) => o.scheduleId === scheduleId);
  },
}));
