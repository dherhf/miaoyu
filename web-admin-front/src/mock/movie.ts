import type { MovieItem } from '../types/movie';

export const mockMovies: MovieItem[] = [
  {
    id: 1, name: '流浪地球3', types: ['scifi', 'action'],
    typeLabel: '科幻、动作', poster_url: '', rating: 9.2, duration: 173,
    release_date: '2026-08-15', director: '郭帆', actors: '吴京、刘德华',
    description: '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。',
    status: 'showing', hasSchedule: true,
  },
  {
    id: 2, name: '哪吒之魔童闹海', types: ['animation', 'action'],
    typeLabel: '动画、动作', poster_url: '', rating: 8.8, duration: 144,
    release_date: '2026-07-20', director: '饺子', actors: '',
    description: '哪吒与敖丙天劫之后，太乙真人用七色宝莲重塑肉身的故事。',
    status: 'showing', hasSchedule: true,
  },
  {
    id: 3, name: '唐人街探案4', types: ['comedy', 'suspense'],
    typeLabel: '喜剧、悬疑', poster_url: '', rating: 7.5, duration: 132,
    release_date: '2026-08-01', director: '陈思诚', actors: '王宝强、刘昊然',
    description: '唐仁和秦风受邀前往伦敦，揭开一起跨国奇案。',
    status: 'showing', hasSchedule: false,
  },
  {
    id: 4, name: '封神第二部', types: ['action', 'scifi'],
    typeLabel: '动作、科幻', poster_url: '', rating: 8.3, duration: 150,
    release_date: '2026-07-15', director: '乌尔善', actors: '费翔、黄渤',
    description: '姬发回到西岐，殷商大军压境，一场大战即将爆发。',
    status: 'showing', hasSchedule: true,
  },
  {
    id: 5, name: '熊出没·重启未来', types: ['animation', 'comedy'],
    typeLabel: '动画、喜剧', poster_url: '', rating: 7.8, duration: 108,
    release_date: '2026-08-10', director: '丁亮', actors: '',
    description: '光头强和熊大熊二意外穿越到未来世界。',
    status: 'offline',
  },
  {
    id: 6, name: '热辣滚烫2', types: ['comedy', 'romance'],
    typeLabel: '喜剧、爱情', poster_url: '', rating: 7.2, duration: 129,
    release_date: '2026-07-28', director: '贾玲', actors: '贾玲、雷佳音',
    description: '乐莹拳击归来，面对新的生活挑战。',
    status: 'showing',
  },
  {
    id: 7, name: '志愿军：存亡之战', types: ['action', 'other'],
    typeLabel: '动作、其他', poster_url: '', rating: 8.1, duration: 155,
    release_date: '2026-07-10', director: '陈凯歌', actors: '唐国强、刘劲',
    description: '讲述抗美援朝战争中铁原阻击战的故事。',
    status: 'showing', hasSchedule: true,
  },
  {
    id: 8, name: '深海2', types: ['animation', 'suspense'],
    typeLabel: '动画、悬疑', poster_url: '', rating: 8.6, duration: 122,
    release_date: '2026-08-20', director: '田晓鹏', actors: '',
    description: '参宿再次坠入深海世界，这一次她要寻找回家的路。',
    status: 'offline',
  },
];
