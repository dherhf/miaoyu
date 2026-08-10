import { create } from 'zustand';
import type { OrderItem, OrderListParams } from './types';
import { mapOrderRecord } from './types';
import { orderApi } from './api';

export type { OrderStatus, OrderSeat, OrderItem } from './types';

interface OrderState {
  orders: OrderItem[];
  total: number;
  loading: boolean;
  fetchOrders: (params: OrderListParams) => Promise<void>;
  fetchOrderDetail: (id: string) => Promise<OrderItem | undefined>;
  checkTicket: (pickupCode: string) => Promise<OrderItem | undefined>;
}

/**
 * 订单管理 Zustand store。
 * fetchOrders 失败时清空列表（不保留旧数据），防止 UI 展示过期信息。
 * checkTicket 成功后返回 OrderItem 供弹窗展示详情。
 */
export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  total: 0,
  loading: false,

  fetchOrders: async (params: OrderListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await orderApi.getOrderList(params);
      set({ orders: res.records.map(mapOrderRecord), total: res.total });
    } catch {
      set({ orders: [], total: 0 });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderDetail: async (id: string): Promise<OrderItem | undefined> => {
    const res = await orderApi.getOrderDetail(id);
    return mapOrderRecord(res);
  },

  checkTicket: async (pickupCode: string): Promise<OrderItem | undefined> => {
    const res = await orderApi.checkTicket(pickupCode);
    return mapOrderRecord(res);
  },
}));
