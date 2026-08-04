import { create } from 'zustand';
import type { OrderItem, OrderListParams } from './types';
import { mapOrderRecord } from './types';
import { getOrderList, getOrderDetail } from './api';

export type { OrderStatus, OrderSeat, OrderItem } from './types';

interface OrderState {
  orders: OrderItem[];
  total: number;
  loading: boolean;
  fetchOrders: (params: OrderListParams) => Promise<void>;
  fetchOrderDetail: (id: number) => Promise<OrderItem | undefined>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  total: 0,
  loading: false,

  fetchOrders: async (params: OrderListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await getOrderList(params);
      set({ orders: res.records.map(mapOrderRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderDetail: async (id: number): Promise<OrderItem | undefined> => {
    const res = await getOrderDetail(id);
    return mapOrderRecord(res);
  },
}));
