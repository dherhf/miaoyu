import { create } from 'zustand'
import { loadAMap } from './loadAMap'
import type { GeolocationData } from './types'

interface GeoState {
  location: GeolocationData | null
  loading: boolean
  error: string | null
  fetchLocation: () => Promise<GeolocationData>
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

      // 方式1: AMap.Geolocation 精确定位（convert:true 自动转 GCJ-02）
      try {
        const geo = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          convert: true,
          needAddress: true,
          showButton: false,
          showMarker: false,
          showCircle: false,
          panToLocation: false,
          zoomToAccuracy: false,
        })

        const result = await new Promise<GeolocationData>((resolve, reject) => {
          geo.getCurrentPosition((status, res) => {
            if (status === 'complete' && res.position) {
              resolve({
                longitude: res.position.getLng(),
                latitude: res.position.getLat(),
                accuracy: res.accuracy,
                address: res.formattedAddress,
                province: res.addressComponent?.province,
                city: Array.isArray(res.addressComponent?.city)
                  ? res.addressComponent.city[0]
                  : res.addressComponent?.city,
                district: res.addressComponent?.district,
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
        geo.getCityInfo((status, res) => {
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
