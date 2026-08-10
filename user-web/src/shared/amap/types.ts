/** 定位结果数据 */
export interface GeolocationData {
  /** GCJ-02 经度（火星坐标系） */
  longitude: number
  /** GCJ-02 纬度（火星坐标系） */
  latitude: number
  /** 定位精度（米） */
  accuracy: number
  /** 格式化地址（逆地理编码结果） */
  address?: string
  /** 省份 */
  province?: string
  /** 城市 */
  city?: string
  /** 区县 */
  district?: string
  /** 定位方式：gps（精确定位）或 ip（IP 城市定位降级） */
  source: 'gps' | 'ip'
}
