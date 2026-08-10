import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, Space, List, Spin, Typography } from 'antd';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import AMapLoader from '@amap/amap-jsapi-loader';
import styles from './LocationPicker.module.css';

export interface LocationData {
  address: string;
  longitude: number;
  latitude: number;
}

export interface LocationPickerProps {
  value?: LocationData;
  onChange?: (data: LocationData) => void;
  readonly?: boolean;
}

/** POI 搜索结果条目（从 AMap.PlaceSearch 回调中提取） */
interface PoiItem {
  id: string;
  name: string;
  address: string;
  location: string;
  tel?: string;
}

/** 高德 JS SDK 加载缓存——全局只加载一次 */
let amapPromise: Promise<typeof AMap> | null = null;

function loadAMap(): Promise<typeof AMap> {
  if (!amapPromise) {
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

const MAP_CONTAINER_ID_PREFIX = 'amap-container-';
let containerIdCounter = 0;

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, readonly = false }) => {
  const [address, setAddress] = useState(value?.address ?? '');
  const [longitude, setLongitude] = useState(value?.longitude ?? 0);
  const [latitude, setLatitude] = useState(value?.latitude ?? 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [poiResults, setPoiResults] = useState<PoiItem[]>([]);

  // 地图相关
  const mapRef = useRef<AMap.Map | null>(null);
  const markerRef = useRef<AMap.Marker | null>(null);
  const geocoderRef = useRef<AMap.Geocoder | null>(null);
  const containerId = useRef(`${MAP_CONTAINER_ID_PREFIX}${++containerIdCounter}`);
  const [mapReady, setMapReady] = useState(false);

  // 始终持有最新的 onChange，避免地图事件监听器中的闭包过期
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
    if (mapRef.current && valLng && valLat) {
      mapRef.current.setZoomAndCenter(17, [valLng, valLat]);
      if (markerRef.current) {
        markerRef.current.setPosition([valLng, valLat]);
      }
    }
  }, [valAddr, valLng, valLat]);

  const emit = useCallback(
    (addr: string, lng: number, lat: number) => {
      setAddress(addr);
      setLongitude(lng);
      setLatitude(lat);
      onChangeRef.current?.({ address: addr, longitude: lng, latitude: lat });
    },
    [],
  );

  // 更新地图标记
  const placeMarker = useCallback(
    (lng: number, lat: number) => {
      if (!markerRef.current || !mapRef.current) return;
      markerRef.current.setPosition([lng, lat]);
      mapRef.current.setZoomAndCenter(17, [lng, lat]);
    },
    [],
  );

  // 逆地理编码（客户端 AMap.Geocoder）
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

  // 点击地图选点
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

  // 初始化地图
  useEffect(() => {
    if (readonly) return;

    let map: AMap.Map | null = null;
    let marker: AMap.Marker | null = null;
    let cancelled = false;

    loadAMap().then((AMap) => {
      if (cancelled) return;

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

      // 点击地图事件
      map.on('click', handleMapClick);

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    });

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

  // POI 搜索（客户端 AMap.PlaceSearch）
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

  // 选中 POI ——逆地理编码后更新标记与地图
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

  if (readonly) {
    return (
      <div>
        <div className={styles.readonlyBar}>
          <EnvironmentOutlined style={{ fontSize: 16, color: '#1677ff' }} />
          <span>{address || '未选择'}</span>
        </div>
      </div>
    );
  }

  const hasLocation = address && longitude !== 0 && latitude !== 0;

  return (
    <div>
      {/* 搜索区 */}
      <div className={styles.searchArea}>
        <Space.Compact className={styles.searchCompact}>
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="输入影院名称或地址搜索"
            prefix={<SearchOutlined style={{ fontSize: 14, color: '#999' }} />}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch} loading={searching}>
            搜索
          </Button>
        </Space.Compact>

        {/* 搜索结果 */}
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
        {/* 地图容器 */}
        <div id={containerId.current} className={styles.mapContainer} />

        {/* 已选位置信息浮层 */}
        {hasLocation && mapReady && (
          <div className={styles.locationOverlay}>
            <EnvironmentOutlined style={{ fontSize: 14, color: '#1677ff' }} />
            <span className={styles.overlayAddress}>
              {address}
            </span>
            <span className={styles.overlayCoords}>
              {longitude.toFixed(6)}, {latitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      <Typography.Text type="secondary" className={styles.hintText}>
        搜索地址或直接点击地图选择位置
      </Typography.Text>
    </div>
  );
};

export default LocationPicker;
