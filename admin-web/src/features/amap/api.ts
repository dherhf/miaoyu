/**
 * WeaveFox 高德地图服务客户端
 * 服务端代理转发，保护 API Key
 *
 * 返回格式统一为：{ code: number, data?: T, message?: string }
 * - code: 200 表示成功，其他表示错误
 */

import type {
  AmapResponse,
  GeocodeResult,
  ReGeocodeResult,
  PoiItem,
  PoiAroundItem,
  RouteResult,
  DistrictResult,
  WeatherResult,
  InputTipItem,
} from './types';

export type {
  GeocodeResult,
  ReGeocodeResult,
  PoiItem,
  PoiAroundItem,
  RouteResult,
  DistrictResult,
  WeatherResult,
  InputTipItem,
} from './types';

const CONFIG = {
  endpoint: 'https://www.weavefox.cn',
  basePath: '/api/v1/amap',
  token: 'wfat_app_da4740a3349ac22860cc6a3cd7394ae0d27778a8fb21c9adc6e9a6b320201922',
};

// ==================== 内部请求 ====================

async function request<T>(path: string, params: Record<string, string>): Promise<AmapResponse<T>> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) searchParams.append(k, v);
  });

  const response = await fetch(`${CONFIG.endpoint}${CONFIG.basePath}${path}?${searchParams}`, {
    headers: { Authorization: `Bearer ${CONFIG.token}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ==================== API ====================

/** 地理编码（地址转坐标） */
export async function geocode(address: string, city?: string): Promise<AmapResponse<GeocodeResult[]>> {
  return request<GeocodeResult[]>('/geocode', { address, city: city ?? '' });
}

/** 逆地理编码（坐标转地址） */
export async function reGeocode(location: string): Promise<AmapResponse<ReGeocodeResult>> {
  return request<ReGeocodeResult>('/regeocode', { location });
}

/** 关键字搜索 POI */
export async function searchPoi(
  keywords: string,
  options: { city?: string; pageSize?: number; pageNum?: number } = {},
): Promise<AmapResponse<PoiItem[]>> {
  return request<PoiItem[]>('/poi/search', {
    keywords,
    city: options.city ?? '',
    pageSize: String(options.pageSize ?? 10),
    pageNum: String(options.pageNum ?? 1),
  });
}

/** 周边搜索 POI */
export async function searchPoiAround(
  location: string,
  options: { keywords?: string; radius?: number } = {},
): Promise<AmapResponse<PoiAroundItem[]>> {
  return request<PoiAroundItem[]>('/poi/around', {
    location,
    keywords: options.keywords ?? '',
    radius: String(options.radius ?? 1000),
  });
}

/** 驾车路径规划 */
export async function drivingRoute(origin: string, destination: string): Promise<AmapResponse<RouteResult[]>> {
  return request<RouteResult[]>('/route/driving', { origin, destination });
}

/** 步行路径规划 */
export async function walkingRoute(origin: string, destination: string): Promise<AmapResponse<RouteResult[]>> {
  return request<RouteResult[]>('/route/walking', { origin, destination });
}

/** 骑行路径规划 */
export async function bicyclingRoute(origin: string, destination: string): Promise<AmapResponse<RouteResult[]>> {
  return request<RouteResult[]>('/route/bicycling', { origin, destination });
}

/** 公交路径规划 */
export async function transitRoute(origin: string, destination: string, city: string): Promise<AmapResponse<RouteResult>> {
  return request<RouteResult>('/route/transit', { origin, destination, city });
}

/** 行政区域查询 */
export async function searchDistrict(keywords: string): Promise<AmapResponse<DistrictResult[]>> {
  return request<DistrictResult[]>('/district', { keywords });
}

/** 天气查询 */
export async function getWeather(city: string, extensions: 'base' | 'all' = 'base'): Promise<AmapResponse<WeatherResult>> {
  return request<WeatherResult>('/weather', { city, extensions });
}

/** 输入提示/自动补全 */
export async function inputTips(keywords: string, city?: string): Promise<AmapResponse<InputTipItem[]>> {
  return request<InputTipItem[]>('/tips', { keywords, city: city ?? '' });
}

export default {
  geocode,
  reGeocode,
  searchPoi,
  searchPoiAround,
  drivingRoute,
  walkingRoute,
  bicyclingRoute,
  transitRoute,
  searchDistrict,
  getWeather,
  inputTips,
};
