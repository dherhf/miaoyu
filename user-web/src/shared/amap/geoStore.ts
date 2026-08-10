import { create } from 'zustand'
import { loadAMap } from './loadAMap'
import type { GeolocationData } from './types'

/** 地理定位状态接口 */
interface GeoState {
  /** 当前定位结果 */
  location: GeolocationData | null
  /** 是否正在定位中 */
  loading: boolean
  /** 定位错误信息 */
  error: string | null
  /** 获取地理位置（优先 GPS，失败降级 IP 定位） */
  fetchLocation: () => Promise<GeolocationData>
}

/**
 * 高德逆地理编码：将经纬度坐标转换为地址信息。
 * @param lng 经度
 * @param lat 纬度
 * @returns 包含地址、省、市、区的部分定位数据
 */
async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<Partial<GeolocationData>> {
  const AMap = await loadAMap()
  const geocoder = new AMap.Geocoder({ city: '', radius: 1000 })
  return new Promise((resolve) => {
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result?.regeocode) {
        const comp = result.regeocode.addressComponent
        resolve({
          address: result.regeocode.formattedAddress,
          province: comp.province,
          city: Array.isArray(comp.city) ? comp.city[0] : comp.city,
          district: comp.district,
        })
      } else {
        resolve({})
      }
    })
  })
}

/**
 * 地理定位 Zustand store。
 * 提供 fetchLocation 方法：优先使用 GPS 精确定位，
 * 失败后降级为 IP 城市级别定位。
 */
export const useGeoStore = create<GeoState>((set, get) => ({
  location: null,
  loading: false,
  error: null,

  fetchLocation: async () => {
    // 防止重复定位
    if (get().loading) return get().location!
    set({ loading: true, error: null })
    try {
      const AMap = await loadAMap()

      // 方式1: AMap.Geolocation GPS 精确定位（需用户授权）
      try {
        const geo = new AMap.Geolocation({
          enableHighAccuracy: true,  // 高精度定位
          timeout: 10000,             // 超时 10 秒
          showButton: false,          // 不显示定位按钮
          showMarker: false,          // 不显示定位标记
          showCircle: false,          // 不显示精度圈
          panToLocation: false,       // 不自动移动地图
          zoomToAccuracy: false,      // 不自动调整视野
        })

        const result = await new Promise<GeolocationData>((resolve, reject) => {
          geo.getCurrentPosition(async (status, res) => {
            if (status === 'complete' && res.position) {
              // GPS 定位成功，获取经纬度后逆地理编码获取地址
              const lng = res.position.getLng()
              const lat = res.position.getLat()
              const address = await reverseGeocode(lng, lat)
              resolve({
                longitude: lng,
                latitude: lat,
                accuracy: res.accuracy,
                address: address.address,
                province: address.province,
                city: address.city,
                district: address.district,
                source: 'gps',
              })
            } else {
              reject(new Error(res?.info || '定位失败'))
            }
          })
        })

        set({ location: result, loading: false })
        return result
      } catch (gpsErr) {
        // GPS 定位失败，降级到 IP 定位
        console.warn('[geoStore] GPS 定位失败，降级 IP 定位:', gpsErr)
      }

      // 方式2: IP 城市定位（降级方案，无需用户授权，精度为城市级别）
      const geo = new AMap.Geolocation({ convert: true })
      const result = await new Promise<GeolocationData>((resolve, reject) => {
        geo.getCityInfo((status, res) => {
          if (status === 'complete' && res.city) {
            resolve({
              longitude: 0,   // IP 定位无精确坐标
              latitude: 0,
              accuracy: 0,
              city: res.city,
              province: res.province,
              source: 'ip',
            })
          } else {
            reject(new Error('IP 定位失败'))
          }
        })
      })

      set({ location: result, loading: false })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : '定位失败'
      set({ error: msg, loading: false })
      throw err
    }
  },
}))
