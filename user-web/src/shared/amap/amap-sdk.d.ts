/** 高德 JS SDK (v2.0) 类型声明——覆盖 Geolocation 插件用到的 API */

declare namespace AMap {
  /** 经纬度坐标 */
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

  /** 点标记配置选项 */
  interface MarkerOptions {
    /** 标记位置坐标 */
    position?: LngLat | [number, number]
    /** 所属地图实例 */
    map?: Map
    /** 图标（URL 或 Icon 对象） */
    icon?: string | Icon
    /** 偏移量 */
    offset?: Pixel | [number, number]
    /** 锚点位置 */
    anchor?: string
    /** 是否可拖拽 */
    draggable?: boolean
  }

  /** 图标配置 */
  interface Icon {
    /** 图标图片 URL */
    image: string
    /** 图标尺寸 */
    size?: [number, number]
    /** 图标显示尺寸 */
    imageSize?: [number, number]
  }

  /** 像素点 */
  class Pixel {
    constructor(x: number, y: number)
  }

  /** 地图实例 */
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

  /** 地图配置选项 */
  interface MapOptions {
    /** 缩放级别 */
    zoom?: number
    /** 中心点坐标 */
    center?: LngLat | [number, number]
    /** 视图模式：2D 或 3D */
    viewMode?: '2D' | '3D'
    /** 是否自动适应容器尺寸变化 */
    resizeEnable?: boolean
    /** 是否允许拖拽 */
    dragEnable?: boolean
    /** 是否允许缩放 */
    zoomEnable?: boolean
    /** 是否允许双击缩放 */
    doubleClickZoom?: boolean
    /** 是否允许键盘操作 */
    keyboardEnable?: boolean
    /** 是否允许滚轮缩放 */
    scrollWheel?: boolean
    /** 地图样式 */
    mapStyle?: string
    /** 图层列表 */
    layers?: any[]
    /** 地图要素 */
    features?: string[]
  }

  // ==================== Geolocation 插件 ====================

  /** 定位配置选项 */
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

  /** 定位结果 */
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
      /** 省份 */
      province?: string
      /** 城市（部分直辖市返回空数组） */
      city?: string | string[]
      /** 区县 */
      district?: string
      /** 区域编码 */
      adcode?: string
      /** 乡镇/街道 */
      township?: string
    }
  }

  /** 城市信息查询结果（IP 定位） */
  interface CityInfoResult {
    /** 状态 */
    status: string
    /** 状态信息 */
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

  /** Geolocation 定位插件类 */
  class Geolocation {
    constructor(opts?: GeolocationOptions)
    /** 获取当前定位位置（GPS 定位，需用户授权） */
    getCurrentPosition(
      callback: (status: 'complete' | 'error', result: GeolocationResult) => void,
    ): void
    /** 获取城市信息（IP 级别定位，无需用户授权） */
    getCityInfo(
      callback: (status: 'complete' | 'error', result: CityInfoResult) => void,
    ): void
  }

  // ==================== Geocoder 插件（逆地理编码）====================

  /** 逆地理编码结果 */
  interface ReGeocodeResult {
    /** 逆地理编码响应 */
    regeocode: {
      /** 格式化地址 */
      formattedAddress: string
      /** 地址组件 */
      addressComponent: {
        /** 省份 */
        province: string
        /** 城市 */
        city: string | string[]
        /** 区县 */
        district: string
        /** 乡镇/街道 */
        township?: string
        /** 区域编码 */
        adcode?: string
      }
    }
  }

  /** Geocoder 逆地理编码插件类 */
  class Geocoder {
    constructor(opts?: { city?: string; radius?: number; extensions?: string })
    /** 逆地理编码：将坐标转换为地址 */
    getAddress(
      lnglat: LngLat | [number, number],
      callback: (status: 'complete' | 'error', result: ReGeocodeResult) => void,
    ): void
  }
}

/** 高德安全密钥配置（挂载到 window 上） */
interface Window {
  _AMapSecurityConfig?: {
    /** 安全密钥 */
    securityJsCode: string
  }
}
