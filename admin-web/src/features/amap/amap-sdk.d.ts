/** 高德 JS SDK (v2.0) 类型声明——仅覆盖 LocationPicker 用到的 API */
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
}
