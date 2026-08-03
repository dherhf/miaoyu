import type { ScheduleItem } from '../types/schedule';

const today = '2026-08-03';
const tomorrow = '2026-08-04';
const dayAfter = '2026-08-05';

export const mockSchedules: ScheduleItem[] = [
  {
    id: 1, cinemaId: 1, cinemaName: '万达影城', hallId: 1, hallName: 'IMAX 1号厅',
    movieId: 1, movieName: '流浪地球3',
    showDate: today, showTime: '10:30', endTime: '13:23',
    price: 89.9, languageVersion: 'chinese_imax',
    totalSeats: 108, soldSeats: 45, availableSeats: 63,
    status: 'available',
  },
  {
    id: 2, cinemaId: 1, cinemaName: '万达影城', hallId: 1, hallName: 'IMAX 1号厅',
    movieId: 1, movieName: '流浪地球3',
    showDate: today, showTime: '14:00', endTime: '16:53',
    price: 99.9, languageVersion: 'chinese_imax',
    totalSeats: 108, soldSeats: 92, availableSeats: 16,
    status: 'available',
  },
  {
    id: 3, cinemaId: 1, cinemaName: '万达影城', hallId: 2, hallName: '杜比全景声厅',
    movieId: 2, movieName: '哪吒之魔童闹海',
    showDate: today, showTime: '19:30', endTime: '21:54',
    price: 69.9, languageVersion: 'chinese_3d',
    totalSeats: 72, soldSeats: 72, availableSeats: 0,
    status: 'full',
  },
  {
    id: 4, cinemaId: 2, cinemaName: 'CGV影城', hallId: 4, hallName: 'IMAX激光厅',
    movieId: 4, movieName: '封神第二部',
    showDate: today, showTime: '20:00', endTime: '22:30',
    price: 109.9, languageVersion: 'chinese_imax',
    totalSeats: 108, soldSeats: 30, availableSeats: 78,
    status: 'available',
  },
  {
    id: 5, cinemaId: 2, cinemaName: 'CGV影城', hallId: 5, hallName: '1号标准厅',
    movieId: 3, movieName: '唐人街探案4',
    showDate: tomorrow, showTime: '15:00', endTime: '17:12',
    price: 59.9, languageVersion: 'chinese_2d',
    totalSeats: 68, soldSeats: 12, availableSeats: 56,
    status: 'available',
  },
  {
    id: 6, cinemaId: 3, cinemaName: '大地影院', hallId: 6, hallName: '巨幕厅',
    movieId: 6, movieName: '热辣滚烫2',
    showDate: dayAfter, showTime: '18:00', endTime: '20:09',
    price: 49.9, languageVersion: 'chinese_2d',
    totalSeats: 90, soldSeats: 0, availableSeats: 90,
    status: 'available',
  },
  {
    id: 7, cinemaId: 1, cinemaName: '万达影城', hallId: 2, hallName: '杜比全景声厅',
    movieId: 7, movieName: '志愿军：存亡之战',
    showDate: '2026-08-01', showTime: '13:00', endTime: '15:35',
    price: 59.9, languageVersion: 'chinese_2d',
    totalSeats: 72, soldSeats: 20, availableSeats: 0,
    status: 'ended',
  },
  {
    id: 8, cinemaId: 4, cinemaName: '百老汇影城', hallId: 7, hallName: 'VIP贵宾厅',
    movieId: 1, movieName: '流浪地球3',
    showDate: '2026-08-02', showTime: '10:00', endTime: '12:53',
    price: 149.9, languageVersion: 'chinese_2d',
    totalSeats: 28, soldSeats: 0, availableSeats: 0,
    status: 'cancelled',
  },
];
