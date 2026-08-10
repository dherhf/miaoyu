import { create } from 'zustand'
import { loadAMap } from './loadAMap'
import type { GeolocationData } from './types'

interface GeoState {
  location: GeolocationData | null
  loading: boolean
  error: string | null
  fetchLocation: () => Promise<GeolocationData>
}

/** AMap 逆地理编码：坐标 → 地址 */
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

export const useGeoStore = create<GeoState>((set, get) => ({
  location: null,
  loading: false,
  error: null,

  fetchLocation: async () => {
    if (get().loading) return get().location!
    set({ loading: true, error: null })
    try {
      const AMap = await loadAMap()

      // 方式1: AMap.Geolocation 定位（参考官方 demo）
      try {
        const geo = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          showButton: false,
          showMarker: false,
          showCircle: false,
          panToLocation: false,
          zoomToAccuracy: false,
        })

        const result = await new Promise<GeolocationData>((resolve, reject) => {
          geo.getCurrentPosition(async (status, res) => {
            if (status === 'complete' && res.position) {
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
        console.warn('[geoStore] GPS 定位失败，降级 IP 定位:', gpsErr)
      }

      // 方式2: IP 城市定位（降级，无需用户授权）
      const geo = new AMap.Geolocation({ convert: true })
      const result = await new Promise<GeolocationData>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('IP 定位超时')), 8000)
        geo.getCityInfo((status, res) => {
          clearTimeout(timer)
          if (status === 'complete' && res.city) {
            resolve({
              longitude: 0,
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
