/**
 * 影厅管理模块统一导出
 */
export { HallPage } from './HallPage';
export {
  useHallStore,
  HALL_TYPES,
  HALL_STATUS_LABELS,
  SEAT_STATUS,
  generateSeats,
  countAvailableSeats,
  addRow,
  removeRow,
  addCol,
  removeCol,
} from './store';
export type { SeatItem, HallItem, HallFormValues } from './types';
