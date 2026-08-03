import type { SeatItem, HallItem } from './types';

function generateMockSeats(rows: number, cols: number, aisleCols: number): SeatItem[] {
  const seats: SeatItem[] = [];
  const midStart = Math.ceil((cols - aisleCols) / 2) + 1;
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const isAisle = aisleCols > 0 && c >= midStart && c < midStart + aisleCols;
      seats.push({ row: r, col: c, status: isAisle ? 'aisle' : 'available' });
    }
  }
  return seats;
}

export const mockHalls: HallItem[] = [
  {
    id: 1, cinemaId: 1, name: 'IMAX 1号厅', type: 'imax',
    rowCount: 10, colCount: 12, totalSeats: 108,
    seats: generateMockSeats(10, 12, 2),
    status: 'active',
  },
  {
    id: 2, cinemaId: 1, name: '杜比全景声厅', type: '2d',
    rowCount: 8, colCount: 10, totalSeats: 72,
    seats: generateMockSeats(8, 10, 1),
    status: 'active',
  },
  {
    id: 3, cinemaId: 1, name: '4DX动感厅', type: '3d',
    rowCount: 6, colCount: 8, totalSeats: 44,
    seats: generateMockSeats(6, 8, 0),
    status: 'active',
  },
  {
    id: 4, cinemaId: 2, name: 'IMAX激光厅', type: 'imax',
    rowCount: 12, colCount: 10, totalSeats: 108,
    seats: generateMockSeats(12, 10, 2),
    status: 'active',
  },
  {
    id: 5, cinemaId: 2, name: '1号标准厅', type: '2d',
    rowCount: 8, colCount: 9, totalSeats: 68,
    seats: generateMockSeats(8, 9, 0),
    status: 'active',
  },
  {
    id: 6, cinemaId: 3, name: '巨幕厅', type: 'imax',
    rowCount: 10, colCount: 10, totalSeats: 90,
    seats: generateMockSeats(10, 10, 2),
    status: 'active',
  },
  {
    id: 7, cinemaId: 4, name: 'VIP贵宾厅', type: '2d',
    rowCount: 5, colCount: 6, totalSeats: 28,
    seats: generateMockSeats(5, 6, 0),
    status: 'active',
  },
  {
    id: 8, cinemaId: 5, name: '1号厅(停用)', type: '2d',
    rowCount: 8, colCount: 8, totalSeats: 58,
    seats: generateMockSeats(8, 8, 1),
    status: 'inactive',
  },
];
