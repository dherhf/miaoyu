/**
 * 影院管理模块统一导出
 * 导出页面组件、store、类型定义
 */

// 影院管理页面组件（别名 CinemaPage）
export { CinemaManage as CinemaPage } from './CinemaPage';

// 影院状态管理 store
export { useCinemaStore } from './store';

// 类型定义
export type { CinemaStatus, CinemaItem, CinemaCreateParams, CinemaListParams } from './types';
