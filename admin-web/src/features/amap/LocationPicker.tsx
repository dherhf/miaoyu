import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, Space, List, Spin, Typography } from 'antd';
import { MapPin, Search } from 'lucide-react';
import AMapLoader from '@amap/amap-jsapi-loader';
import styles from './LocationPicker.module.css';

/** 选中位置的数据结构 */
export interface LocationData {
  /** 格式化地址（逆地理编码结果） */
  address: string;
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
}

/** LocationPicker 组件属性 */
export interface LocationPickerProps {
  /** 当前位置数据（编辑模式下回填） */
  value?: LocationData;
  /** 位置变化回调 */
  onChange?: (data: LocationData) => void;
  /** 是否只读模式（不显示地图和搜索，仅展示地址） */
  readonly?: boolean;
}

/** POI 搜索结果条目（从 AMap.PlaceSearch 回调中提取） */
interface PoiItem {
  /** POI 唯一标识 */
  id: string;
  /** POI 名称 */
  name: string;
  /** POI 地址 */
  address: string;
  /** 经纬度字符串 "lng,lat" */
  location: string;
  /** 电话 */
  tel?: string;
}

/** 高德 JS SDK 加载缓存——全局只加载一次，避免重复请求 */
let amapPromise: Promise<typeof AMap> | null = null;

/**
 * 加载高德地图 JS SDK
 * - 读取环境变量中的安全密钥和 JS Key
 * - 加载 PlaceSearch（POI 搜索）和 Geocoder（逆地理编码）插件
 * - 使用全局缓存确保 SDK 只加载一次
 *
 * @returns Promise<typeof AMap> 高德地图命名空间
 */
function loadAMap(): Promise<typeof AMap> {
  if (!amapPromise) {
    // 配置安全密钥（高德 v2.0 要求）
    const securityCode = import.meta.env.VITE_ADMIN_AMAP_SECURITY_CODE;
    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode };
    }
    amapPromise = AMapLoader.load({
      key: import.meta.env.VITE_ADMIN_AMAP_JS_KEY || 'your_amap_js_key_here',
      version: '2.0',
      plugins: ['AMap.PlaceSearch', 'AMap.Geocoder'],
    });
  }
  return amapPromise;
}

// 地图容器 ID 前缀和自增计数器（确保每个组件实例有唯一容器 ID）
const MAP_CONTAINER_ID_PREFIX = 'amap-container-';
let containerIdCounter = 0;

/**
 * 地图选点组件
 *
 * 功能：
 * 1. 搜索影院名称或地址，展示 POI 搜索结果列表
 * 2. 点击地图任意位置打点选位
 * 3. 选中 POI 或点击地图后，自动逆地理编码获取格式化地址
 * 4. 支持只读模式（仅展示地址）
 *
 * 使用的高德 SDK 插件：
 * - AMap.PlaceSearch：POI 关键词搜索
 * - AMap.Geocoder：逆地理编码（坐标 → 地址）
 */
const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, readonly = false }) => {
  // 地址状态
  const [address, setAddress] = useState(value?.address ?? '');
  // 经度状态
  const [longitude, setLongitude] = useState(value?.longitude ?? 0);
  // 纬度状态
  const [latitude, setLatitude] = useState(value?.latitude ?? 0);
  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');
  // 搜索中状态
  const [searching, setSearching] = useState(false);
  // POI 搜索结果列表
  const [poiResults, setPoiResults] = useState<PoiItem[]>([]);

  // 地图相关引用
  const mapRef = useRef<AMap.Map | null>(null);        // 地图实例
  const markerRef = useRef<AMap.Marker | null>(null);   // 标记实例
  const geocoderRef = useRef<AMap.Geocoder | null>(null); // 逆地理编码实例
  const containerId = useRef(`${MAP_CONTAINER_ID_PREFIX}${++containerIdCounter}`); // 唯一容器 ID
  const [mapReady, setMapReady] = useState(false);      // 地图是否加载完成

  // 始终持有最新的 onChange，避免地图事件监听器中的闭包过期问题
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 同步外部 value（仅在关键字段变化时触发，避免每次渲染都重置内部状态）
  const valAddr = value?.address ?? '';
  const valLng = value?.longitude ?? 0;
  const valLat = value?.latitude ?? 0;
  useEffect(() => {
    setAddress(valAddr);
    setLongitude(valLng);
    setLatitude(valLat);
    // 地图已就绪时同步更新中心和标记位置
    if (mapRef.current && valLng && valLat) {
      mapRef.current.setZoomAndCenter(17, [valLng, valLat]);
      if (markerRef.current) {
        markerRef.current.setPosition([valLng, valLat]);
      }
    }
  }, [valAddr, valLng, valLat]);

  /**
   * 统一更新位置数据并通知外部
   * 更新内部状态（address/longitude/latitude）并调用 onChange 回调
   */
  const emit = useCallback(
    (addr: string, lng: number, lat: number) => {
      setAddress(addr);
      setLongitude(lng);
      setLatitude(lat);
      onChangeRef.current?.({ address: addr, longitude: lng, latitude: lat });
    },
    [],
  );

  /**
   * 更新地图标记位置
   * 移动 Marker 到新坐标并调整地图中心和缩放级别
   */
  const placeMarker = useCallback(
    (lng: number, lat: number) => {
      if (!markerRef.current || !mapRef.current) return;
      markerRef.current.setPosition([lng, lat]);
      mapRef.current.setZoomAndCenter(17, [lng, lat]);
    },
    [],
  );

  /**
   * 逆地理编码：将坐标转换为格式化地址
   * 使用高德 Geocoder 插件，异步返回地址字符串
   *
   * @returns Promise<string> 格式化地址，失败时返回空字符串
   */
  const reverseGeocode = useCallback(
    (lng: number, lat: number): Promise<string> => {
      return new Promise((resolve) => {
        if (!geocoderRef.current) {
          resolve('');
          return;
        }
        geocoderRef.current.getAddress([lng, lat], (status, result) => {
          if (status === 'complete' && result?.regeocode?.formattedAddress) {
            resolve(result.regeocode.formattedAddress);
          } else {
            resolve('');
          }
        });
      });
    },
    [],
  );

  /**
   * 地图点击事件处理
   * 1. 从点击事件获取经纬度
   * 2. 移动标记到点击位置
   * 3. 逆地理编码获取地址
   * 4. 更新状态并通知外部
   */
  const handleMapClick = useCallback(
    async (e: any) => {
      const lng = e.lnglat.getLng();
      const lat = e.lnglat.getLat();
      placeMarker(lng, lat);
      const addr = await reverseGeocode(lng, lat);
      emit(addr || `${lng.toFixed(6)}, ${lat.toFixed(6)}`, lng, lat);
    },
    [placeMarker, emit, reverseGeocode],
  );

  /**
   * 初始化地图实例
   * - 加载高德 SDK
   * - 创建地图和标记
   * - 初始化逆地理编码实例
   * - 绑定地图点击事件
   * - 组件卸载时销毁地图和清理引用
   * 只在 readonly 变化时重新初始化
   */
  useEffect(() => {
    if (readonly) return;

    let map: AMap.Map | null = null;
    let marker: AMap.Marker | null = null;
    let cancelled = false;

    loadAMap().then((AMap) => {
      if (cancelled) return;

      // 创建地图实例
      map = new AMap.Map(containerId.current, {
        zoom: 14,
        center: longitude && latitude ? [longitude, latitude] : [116.397428, 39.90923], // 默认北京
        viewMode: '2D',
        resizeEnable: true,
      });

      // 创建标记
      marker = new AMap.Marker({
        position: longitude && latitude ? [longitude, latitude] : [116.397428, 39.90923],
        anchor: 'bottom-center',
      });
      map.add(marker);

      // 创建逆地理编码实例
      geocoderRef.current = new AMap.Geocoder({ extensions: 'all' });

      // 绑定地图点击事件
      map.on('click', handleMapClick);

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    });

    // 清理函数：卸载时销毁地图
    return () => {
      cancelled = true;
      if (map) {
        map.off('click', handleMapClick);
        map.destroy();
      }
      mapRef.current = null;
      markerRef.current = null;
      geocoderRef.current = null;
      setMapReady(false);
    };
    // 只在 readonly 变化时重新初始化；longitude/latitude 初始值用 ref 方式处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly]);

  /**
   * POI 关键词搜索
   * 使用高德 PlaceSearch 插件搜索影院名称或地址
   * 返回最多 10 条结果，显示在列表中供用户选择
   */
  const handleSearch = useCallback(() => {
    if (!searchKeyword.trim() || !mapRef.current) return;
    setSearching(true);

    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
      autoFitView: false,
    });
    placeSearch.search(searchKeyword.trim(), (status, result) => {
      if (status === 'complete' && result?.poiList?.pois?.length) {
        // 将 POI 结果转换为组件内部格式
        const items: PoiItem[] = result.poiList.pois.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          location: `${p.location.getLng()},${p.location.getLat()}`,
          tel: p.tel,
        }));
        setPoiResults(items);
      } else {
        setPoiResults([]);
      }
      setSearching(false);
    });
  }, [searchKeyword]);

  /**
   * 选中 POI 结果处理
   * 1. 解析 POI 的经纬度
   * 2. 移动标记和地图到该位置
   * 3. 逆地理编码获取格式化地址
   * 4. 清空搜索结果列表
   */
  const handleSelectPoi = useCallback(
    async (item: PoiItem) => {
      const [lng, lat] = item.location.split(',').map(Number);
      placeMarker(lng, lat);
      const addr = await reverseGeocode(lng, lat);
      emit(addr || item.address, lng, lat);
      setPoiResults([]);
      setSearchKeyword(item.name);
    },
    [emit, placeMarker, reverseGeocode],
  );

  // 只读模式：仅展示地址，不显示地图和搜索
  if (readonly) {
    return (
      <div>
        <div className={styles.readonlyBar}>
          <MapPin size={16} color="#1677ff" />
          <span>{address || '未选择'}</span>
        </div>
      </div>
    );
  }

  // 是否已选择位置
  const hasLocation = address && longitude !== 0 && latitude !== 0;

  return (
    <div>
      {/* 搜索区：关键词输入 + 搜索按钮 */}
      <div className={styles.searchArea}>
        <Space.Compact className={styles.searchCompact}>
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="输入影院名称或地址搜索"
            prefix={<Search size={14} color="#999" />}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch} loading={searching}>
            搜索
          </Button>
        </Space.Compact>

        {/* POI 搜索结果列表 */}
        {poiResults.length > 0 && (
          <List
            size="small"
            bordered
            className={styles.poiList}
            dataSource={poiResults}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => handleSelectPoi(item)}
                className={styles.poiListItem}
              >
                <List.Item.Meta
                  title={<span className={styles.poiName}>{item.name}</span>}
                  description={<span className={styles.poiAddress}>{item.address}</span>}
                />
              </List.Item>
            )}
          />
        )}
        {/* 搜索中 Loading */}
        {searching && (
          <div className={styles.searchingHint}>
            <Spin size="small" />
          </div>
        )}
      </div>

      {/* 地图区域 */}
      <div className={styles.mapWrapper}>
        {/* SDK 加载中的占位 */}
        {!mapReady && (
          <div className={styles.mapLoading}>
            <Spin size="small" />
            <Typography.Text type="secondary" className={styles.loadingText}>地图加载中...</Typography.Text>
          </div>
        )}
        {/* 地图容器（高德 SDK 会在此 DOM 节点渲染地图） */}
        <div id={containerId.current} className={styles.mapContainer} />

        {/* 已选位置信息浮层 */}
        {hasLocation && mapReady && (
          <div className={styles.locationOverlay}>
            <MapPin size={14} color="#1677ff" />
            <span className={styles.overlayAddress}>
              {address}
            </span>
            <span className={styles.overlayCoords}>
              {longitude.toFixed(6)}, {latitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* 操作提示 */}
      <Typography.Text type="secondary" className={styles.hintText}>
        搜索地址或直接点击地图选择位置
      </Typography.Text>
    </div>
  );
};

export default LocationPicker;
