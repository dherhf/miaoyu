/** 定位结果 */
export interface GeolocationData {
  /** GCJ-02 经度 */
  longitude: number
  /** GCJ-02 纬度 */
  latitude: number
  /** 精度（米） */
  accuracy: number
  /** 格式化地址 */
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
