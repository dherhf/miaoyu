import type { CinemaItem } from '../types/cinema';

export const mockCinemas: CinemaItem[] = [
  {
    id: 1, name: '万达影城', branch: 'IMAX店',
    address: '北京市朝阳区建国路88号万达广场5层',
    longitude: 116.4731, latitude: 39.9087,
    facilities: ['IMAX', '杜比', '4DX', 'VIP厅'],
    rating: 8.5, phone: '010-88886666',
    status: 'active', hallCount: 6,
  },
  {
    id: 2, name: 'CGV影城', branch: '颐堤港店',
    address: '北京市朝阳区酒仙桥路18号颐堤港3层',
    longitude: 116.4905, latitude: 39.9653,
    facilities: ['IMAX', 'Dolby Atmos', '儿童厅'],
    rating: 8.2, phone: '010-66668888',
    status: 'active', hallCount: 5,
  },
  {
    id: 3, name: '大地影院', branch: '望京店',
    address: '北京市朝阳区望京街9号望京国际商业中心4层',
    longitude: 116.4815, latitude: 39.9904,
    facilities: ['巨幕厅', 'Reald 3D'],
    rating: 7.8, phone: '010-55551234',
    status: 'active', hallCount: 4,
  },
  {
    id: 4, name: '百老汇影城', branch: '三里屯店',
    address: '北京市朝阳区三里屯太古里南区B1',
    longitude: 116.4551, latitude: 39.9322,
    facilities: ['杜比', 'VIP厅'],
    rating: 8.9, phone: null,
    status: 'active', hallCount: 3,
  },
  {
    id: 5, name: '橙天嘉禾影城', branch: '通州店',
    address: '北京市通州区新华西街58号万达广场4层',
    longitude: 116.6633, latitude: 39.9042,
    facilities: ['4DX', '巨幕厅'],
    rating: null, phone: '010-77778888',
    status: 'closed', hallCount: 4,
  },
];
