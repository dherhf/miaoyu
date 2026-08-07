/** 高德 JS SDK (v2.0) 类型声明——覆盖 Geolocation 插件用到的 API */

declare namespace AMap {
  /** 经纬度 */
  class LngLat {
    constructor(lng: number, lat: number)
    getLng(): number
    getLat(): number
  }

  /** 点标记 */
  class Marker {
    constructor(opts?: MarkerOptions)
    setPosition(pos: LngLat | [number, number]): void
    setMap(map: Map | null): void
    on(event: string, handler: Function): void
  }

  interface MarkerOptions {
    position?: LngLat | [number, number]
    map?: Map
    icon?: string | Icon
    offset?: Pixel | [number, number]
    anchor?: string
    draggable?: boolean
  }

  interface Icon {
    image: string
    size?: [number, number]
    imageSize?: [number, number]
  }

  /** 像素点 */
  class Pixel {
    constructor(x: number, y: number)
  }

  /** 地图 */
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions)
    on(event: string, handler: (e: any) => void): void
    off(event: string, handler: (e: any) => void): void
    setCenter(center: LngLat | [number, number]): void
    setZoom(zoom: number): void
    setZoomAndCenter(zoom: number, center: LngLat | [number, number]): void
    getCenter(): LngLat
    getZoom(): number
    add(overlay: Marker): void
    remove(overlay: Marker): void
    destroy(): void
  }

  interface MapOptions {
    zoom?: number
    center?: LngLat | [number, number]
    viewMode?: '2D' | '3D'
    resizeEnable?: boolean
    dragEnable?: boolean
    zoomEnable?: boolean
    doubleClickZoom?: boolean
    keyboardEnable?: boolean
    scrollWheel?: boolean
    mapStyle?: string
    layers?: any[]
    features?: string[]
  }

  // ==================== Geolocation 插件 ====================

  interface GeolocationOptions {
    /** 是否使用高精度定位，默认 true */
    enableHighAccuracy?: boolean
    /** 定位超时时间（毫秒），默认无穷大 */
    timeout?: number
    /** 缓存定位结果时间（毫秒），默认 0 */
    maximumAge?: number
    /** 是否自动将坐标转换为高德坐标（GCJ-02），默认 true */
    convert?: boolean
    /** 是否需要逆地理编码信息（地址），默认 false */
    needAddress?: boolean
    /** 是否显示定位按钮，默认 true */
    showButton?: boolean
    /** 是否显示定位点标记，默认 true */
    showMarker?: boolean
    /** 是否显示定位精度圈，默认 true */
    showCircle?: boolean
    /** 定位成功后是否将地图中心移至定位点，默认 true */
    panToLocation?: boolean
    /** 定位成功后是否调整地图视野使定位位置及精度圈可见，默认 false */
    zoomToAccuracy?: boolean
    /** 优先使用 GPS 定位 */
    GeoLocationFirst?: boolean
    /** 禁止 IP 定位：0=允许, 1=禁止 */
    noIpLocate?: number
    /** 使用系统原生定位 */
    useNative?: boolean
  }

  interface GeolocationResult {
    /** 状态：complete 或 error */
    status: string
    /** 定位坐标（GCJ-02） */
    position: LngLat
    /** 精度（米） */
    accuracy: number
    /** 定位类型 */
    location_type: string
    /** 状态信息 */
    info: string
    /** 格式化地址（needAddress 为 true 时返回） */
    formattedAddress?: string
    /** 地址组件（needAddress 为 true 时返回） */
    addressComponent?: {
      province?: string
      city?: string | string[]
      district?: string
      adcode?: string
      township?: string
    }
  }

  interface CityInfoResult {
    status: string
    info: string
    /** 城市名称 */
    city: string
    /** 城市编码 */
    adcode: string
    /** 省份名称 */
    province: string
    /** 城市矩形范围 */
    rectangle: string
  }

  class Geolocation {
    constructor(opts?: GeolocationOptions)
    /** 获取当前定位位置 */
    getCurrentPosition(
      callback: (status: 'complete' | 'error', result: GeolocationResult) => void,
    ): void
    /** 获取城市信息（IP 级别定位，无需用户授权） */
    getCityInfo(
      callback: (status: 'complete' | 'error', result: CityInfoResult) => void,
    ): void
  }
}

interface Window {
  _AMapSecurityConfig?: {
    securityJsCode: string
  }
}
