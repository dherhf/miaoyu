/** 高德 JS SDK (v2.0) 类型声明——覆盖 LocationPicker 用到的 API */

declare namespace AMap {
  /** 经纬度 */
  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }

  /** 点标记 */
  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(pos: LngLat | [number, number]): void;
    setMap(map: Map | null): void;
    on(event: string, handler: Function): void;
  }

  interface MarkerOptions {
    position?: LngLat | [number, number];
    map?: Map;
    icon?: string | Icon;
    offset?: Pixel | [number, number];
    anchor?: string;
    draggable?: boolean;
  }

  interface Icon {
    image: string;
    size?: [number, number];
    imageSize?: [number, number];
  }

  /** 像素点 */
  class Pixel {
    constructor(x: number, y: number);
  }

  /** 地图 */
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions);
    on(event: string, handler: (e: any) => void): void;
    off(event: string, handler: (e: any) => void): void;
    setCenter(center: LngLat | [number, number]): void;
    setZoom(zoom: number): void;
    setZoomAndCenter(zoom: number, center: LngLat | [number, number]): void;
    getCenter(): LngLat;
    getZoom(): number;
    add(overlay: Marker): void;
    remove(overlay: Marker): void;
    destroy(): void;
  }

  interface MapOptions {
    zoom?: number;
    center?: LngLat | [number, number];
    viewMode?: '2D' | '3D';
    resizeEnable?: boolean;
    dragEnable?: boolean;
    zoomEnable?: boolean;
    doubleClickZoom?: boolean;
    keyboardEnable?: boolean;
    scrollWheel?: boolean;
    mapStyle?: string;
    layers?: any[];
    features?: string[];
  }

  // ==================== PlaceSearch 插件 ====================

  interface PlaceSearchOptions {
    pageSize?: number;
    pageIndex?: number;
    city?: string;
    citylimit?: boolean;
    map?: Map;
    panel?: string | HTMLElement | false;
    autoFitView?: boolean;
    type?: string;
    lang?: string;
  }

  interface Poi {
    id: string;
    name: string;
    type: string;
    address: string;
    location: LngLat;
    tel: string;
    website?: string;
    pcode?: string;
    citycode?: string;
    adcode?: string;
    postcode?: string;
    pname?: string;
    cityname?: string;
    adname?: string;
    email?: string;
    photos?: { title: string; url: string }[];
    biz_ext?: Record<string, string>;
    indoor_map?: string;
    parent?: string;
    children?: string;
    groupbuy?: boolean;
    discount?: boolean;
  }

  interface PlaceSearchResult {
    info: string;
    poiList: {
      pageIndex: number;
      pageSize: number;
      count: number;
      pois: Poi[];
    };
  }

  class PlaceSearch {
    constructor(opts?: PlaceSearchOptions);
    search(
      keyword: string,
      callback: (status: 'complete' | 'error' | 'no_data', result: PlaceSearchResult) => void,
    ): void;
    searchInBounds?(
      keyword: string,
      bounds: any,
      callback: (status: string, result: PlaceSearchResult) => void,
    ): void;
    setCity?(city: string): void;
    setType?(type: string): void;
    setPageIndex?(pageIndex: number): void;
    setPageSize?(pageSize: number): void;
    clear?(): void;
  }

  // ==================== Geocoder 插件（逆地理编码）====================

  interface ReGeocodeResult {
    regeocode: {
      formattedAddress: string;
      addressComponent: {
        province: string;
        city: string | string[];
        district: string;
        township?: string;
        adcode?: string;
      };
    };
  }

  class Geocoder {
    constructor(opts?: { city?: string; radius?: number; extensions?: string });
    /** 逆地理编码：坐标 → 地址 */
    getAddress(
      lnglat: LngLat | [number, number],
      callback: (status: 'complete' | 'error', result: ReGeocodeResult) => void,
    ): void;
    /** 地理编码：地址 → 坐标 */
    getLocation?(
      address: string,
      callback: (status: 'complete' | 'error', result: any) => void,
    ): void;
  }

  // ==================== 插件加载 ====================

  function plugin(
    plugins: string | string[],
    callback: () => void,
  ): void;
}

interface Window {
  _AMapSecurityConfig?: {
    securityJsCode: string;
  };
}
