import { create } from 'zustand';
import type { OrderItem, OrderListParams } from './types';
import { mapOrderRecord } from './types';
import { orderApi } from './api';

export type { OrderStatus, OrderSeat, OrderItem } from './types';

/**
 * 订单状态管理接口
 */
interface OrderState {
  /** 订单列表 */
  orders: OrderItem[];
  /** 数据总条数 */
  total: number;
  /** 加载中状态 */
  loading: boolean;
  /** 查询订单列表 */
  fetchOrders: (params: OrderListParams) => Promise<void>;
  /** 查询订单详情 */
  fetchOrderDetail: (id: string) => Promise<OrderItem | undefined>;
  /** 检票 */
  checkTicket: (pickupCode: string) => Promise<OrderItem | undefined>;
}

/**
 * 订单状态管理 Store（Zustand）
 *
 * 管理订单列表、详情和检票操作：
 * - fetchOrders：查询列表，结果通过 mapOrderRecord 转换
 * - fetchOrderDetail：查询单条详情
 * - checkTicket：通过取票码检票
 */
export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  total: 0,
  loading: false,

  /**
   * 查询订单列表
   * @param params - 查询参数
   */
  fetchOrders: async (params: OrderListParams): Promise<void> => {
    set({ loading: true });
    try {
      const res = await orderApi.getOrderList(params);
      // 将 API 返回的 OrderRecord 转换为前端展示用 OrderItem
      set({ orders: res.records.map(mapOrderRecord), total: res.total });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 查询订单详情
   * @param id - 订单 ID
   * @returns 转换后的订单详情
   */
  fetchOrderDetail: async (id: string): Promise<OrderItem | undefined> => {
    const res = await orderApi.getOrderDetail(id);
    return mapOrderRecord(res);
  },

  /**
   * 检票
   * @param pickupCode - 6位取票码
   * @returns 检票成功后的订单详情
   */
  checkTicket: async (pickupCode: string): Promise<OrderItem | undefined> => {
    const res = await orderApi.checkTicket(pickupCode);
    return mapOrderRecord(res);
  },
}));
