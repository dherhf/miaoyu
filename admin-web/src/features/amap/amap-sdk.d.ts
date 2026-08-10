/**
 * 高德地图 JS SDK (v2.0) 类型声明文件
 *
 * 覆盖 LocationPicker 组件中用到的 AMap API，包括：
 * - LngLat：经纬度
 * - Marker：地图点标记
 * - Map：地图实例
 * - PlaceSearch：POI 关键词搜索插件
 * - Geocoder：逆地理编码/地理编码插件
 *
 * 注：此文件为声明文件（.d.ts），不产生运行时代码，
 * 仅为 TypeScript 编译器提供类型信息。
 */

declare namespace AMap {
  /** 经纬度坐标 */
  class LngLat {
    constructor(lng: number, lat: number);
    /** 获取经度 */
    getLng(): number;
    /** 获取纬度 */
    getLat(): number;
  }

  /** 地图点标记 */
  class Marker {
    constructor(opts?: MarkerOptions);
    /** 设置标记位置 */
    setPosition(pos: LngLat | [number, number]): void;
    /** 设置标记所属的地图实例 */
    setMap(map: Map | null): void;
    /** 绑定事件监听 */
    on(event: string, handler: Function): void;
  }

  /** Marker 构造配置 */
  interface MarkerOptions {
    /** 标记位置 */
    position?: LngLat | [number, number];
    /** 所属地图 */
    map?: Map;
    /** 图标 */
    icon?: string | Icon;
    /** 像素偏移量 */
    offset?: Pixel | [number, number];
    /** 锚点位置 */
    anchor?: string;
    /** 是否可拖拽 */
    draggable?: boolean;
  }

  /** 图标配置 */
  interface Icon {
    /** 图标图片 URL */
    image: string;
    /** 图标尺寸 */
    size?: [number, number];
    /** 图片实际显示尺寸 */
    imageSize?: [number, number];
  }

  /** 像素点（用于偏移量计算） */
  class Pixel {
    constructor(x: number, y: number);
  }

  /** 地图实例 */
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions);
    /** 绑定事件 */
    on(event: string, handler: (e: any) => void): void;
    /** 解绑事件 */
    off(event: string, handler: (e: any) => void): void;
    /** 设置地图中心点 */
    setCenter(center: LngLat | [number, number]): void;
    /** 设置缩放级别 */
    setZoom(zoom: number): void;
    /** 同时设置缩放级别和中心点 */
    setZoomAndCenter(zoom: number, center: LngLat | [number, number]): void;
    /** 获取当前中心点 */
    getCenter(): LngLat;
    /** 获取当前缩放级别 */
    getZoom(): number;
    /** 添加覆盖物（Marker 等） */
    add(overlay: Marker): void;
    /** 移除覆盖物 */
    remove(overlay: Marker): void;
    /** 销毁地图实例 */
    destroy(): void;
  }

  /** 地图构造配置 */
  interface MapOptions {
    /** 缩放级别 */
    zoom?: number;
    /** 中心点坐标 */
    center?: LngLat | [number, number];
    /** 视图模式：2D 或 3D */
    viewMode?: '2D' | '3D';
    /** 是否自适应容器大小变化 */
    resizeEnable?: boolean;
    /** 是否允许拖拽 */
    dragEnable?: boolean;
    /** 是否允许缩放 */
    zoomEnable?: boolean;
    /** 是否允许双击放大 */
    doubleClickZoom?: boolean;
    /** 是否允许键盘操作 */
    keyboardEnable?: boolean;
    /** 是否允许滚轮缩放 */
    scrollWheel?: boolean;
    /** 地图样式 */
    mapStyle?: string;
    /** 图层列表 */
    layers?: any[];
    /** 地图特性 */
    features?: string[];
  }

  // ==================== PlaceSearch 插件（POI 关键词搜索）====================

  /** PlaceSearch 构造配置 */
  interface PlaceSearchOptions {
    /** 每页结果数 */
    pageSize?: number;
    /** 当前页码 */
    pageIndex?: number;
    /** 搜索城市 */
    city?: string;
    /** 是否限制在当前城市内搜索 */
    citylimit?: boolean;
    /** 结果渲染到的地图实例 */
    map?: Map;
    /** 结果列表渲染到的 DOM 容器 */
    panel?: string | HTMLElement | false;
    /** 是否自动调整视野到结果范围 */
    autoFitView?: boolean;
    /** POI 类型 */
    type?: string;
    /** 返回语言 */
    lang?: string;
  }

  /** 单个 POI 搜索结果 */
  interface Poi {
    /** POI 唯一标识 */
    id: string;
    /** 名称 */
    name: string;
    /** 类型 */
    type: string;
    /** 地址 */
    address: string;
    /** 经纬度位置 */
    location: LngLat;
    /** 电话 */
    tel: string;
    /** 网站 */
    website?: string;
    /** 省级行政区代码 */
    pcode?: string;
    /** 城市编码 */
    citycode?: string;
    /** 区县编码 */
    adcode?: string;
    /** 邮编 */
    postcode?: string;
    /** 省名 */
    pname?: string;
    /** 城市名 */
    cityname?: string;
    /** 区县名 */
    adname?: string;
    /** 邮箱 */
    email?: string;
    /** 照片列表 */
    photos?: { title: string; url: string }[];
    /** 扩展业务信息 */
    biz_ext?: Record<string, string>;
    /** 是否有室内地图 */
    indoor_map?: string;
    /** 父级 ID */
    parent?: string;
    /** 子级 ID */
    children?: string;
    /** 是否有团购 */
    groupbuy?: boolean;
    /** 是否有优惠 */
    discount?: boolean;
  }

  /** PlaceSearch 搜索结果 */
  interface PlaceSearchResult {
    /** 结果信息 */
    info: string;
    /** POI 列表 */
    poiList: {
      /** 当前页码 */
      pageIndex: number;
      /** 每页数量 */
      pageSize: number;
      /** 总数 */
      count: number;
      /** POI 数组 */
      pois: Poi[];
    };
  }

  /** POI 搜索插件 */
  class PlaceSearch {
    constructor(opts?: PlaceSearchOptions);
    /** 关键词搜索 */
    search(
      keyword: string,
      callback: (status: 'complete' | 'error' | 'no_data', result: PlaceSearchResult) => void,
    ): void;
    /** 在指定范围内搜索 */
    searchInBounds?(
      keyword: string,
      bounds: any,
      callback: (status: string, result: PlaceSearchResult) => void,
    ): void;
    /** 设置搜索城市 */
    setCity?(city: string): void;
    /** 设置 POI 类型 */
    setType?(type: string): void;
    /** 设置页码 */
    setPageIndex?(pageIndex: number): void;
    /** 设置每页数量 */
    setPageSize?(pageSize: number): void;
    /** 清除搜索结果 */
    clear?(): void;
  }

  // ==================== Geocoder 插件（逆地理编码）====================

  /** 逆地理编码结果 */
  interface ReGeocodeResult {
    regeocode: {
      /** 格式化地址 */
      formattedAddress: string;
      /** 地址组成部分 */
      addressComponent: {
        /** 省份 */
        province: string;
        /** 城市 */
        city: string | string[];
        /** 区县 */
        district: string;
        /** 乡镇/街道 */
        township?: string;
        /** 区县编码 */
        adcode?: string;
      };
    };
  }

  /** 地理编码插件（地址 ↔ 坐标互转） */
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

  /** 加载高德地图插件（如 PlaceSearch、Geocoder） */
  function plugin(
    plugins: string | string[],
    callback: () => void,
  ): void;
}

/** 全局 window 扩展：高德安全密钥配置 */
interface Window {
  /** 高德 JS API 安全密钥配置 */
  _AMapSecurityConfig?: {
    securityJsCode: string;
  };
}
