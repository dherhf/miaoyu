// ===================== 高德地图相关类型 =====================

/** 高德服务统一响应（与业务 ApiResponse 不同） */
export interface AmapResponse<T> {
  code: number;
  data?: T;
  message?: string;
}

/** 地理编码结果 */
export interface GeocodeResult {
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  longitude: string;
  latitude: string;
}

/** 逆地理编码结果 */
export interface ReGeocodeResult {
  formattedAddress: string;
  addressComponent: Record<string, unknown>;
}

/** POI 条目 */
export interface PoiItem {
  id: string;
  name: string;
  address: string;
  location: string;
  type: string;
  tel?: string;
  photos?: { title: string; url: string }[];
}

/** 周边 POI 条目 */
export interface PoiAroundItem extends PoiItem {
  distance?: string;
}

/** 路径规划结果 */
export interface RouteResult {
  distance: number;
  duration: number;
  steps: Record<string, unknown>[];
}

/** 行政区域结果 */
export interface DistrictResult {
  adcode: string;
  name: string;
  center: string;
  level: string;
  districts: Record<string, unknown>[];
}

/** 天气结果 */
export interface WeatherResult {
  city: string;
  adcode: string;
  province: string;
  weather: string;
  temperature: string;
  windDirection: string;
  windPower: string;
  humidity: string;
  reportTime: string;
  forecasts?: Record<string, unknown>[];
}

/** 输入提示条目 */
export interface InputTipItem {
  keywords: string;
  address: string;
  location: string;
  adcode: string;
  city: string;
}
