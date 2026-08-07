import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, Space, List, Spin, Typography } from 'antd';
import { MapPin, Search } from 'lucide-react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { searchPoi, reGeocode, type PoiItem } from './api';
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

/** 高德 JS SDK 加载缓存——全局只加载一次 */
let amapPromise: Promise<typeof AMap> | null = null;

function loadAMap(): Promise<typeof AMap> {
  if (!amapPromise) {
    amapPromise = AMapLoader.load({
      key: import.meta.env.ADMIN_AMAP_JS_KEY || 'your_amap_js_key_here',
      version: '2.0',
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

  // 点击地图选点
  const handleMapClick = useCallback(
    async (e: any) => {
      const lng = e.lnglat.getLng();
      const lat = e.lnglat.getLat();
      placeMarker(lng, lat);
      try {
        const res = await reGeocode(`${lng},${lat}`);
        const addr = res.code === 200 && res.data ? res.data.formattedAddress : `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
        emit(addr, lng, lat);
      } catch {
        emit(`${lng.toFixed(6)}, ${lat.toFixed(6)}`, lng, lat);
      }
    },
    [placeMarker, emit],
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
      setMapReady(false);
    };
    // 只在 readonly 变化时重新初始化；longitude/latitude 初始值用 ref 方式处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly]);

  // POI 搜索
  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    try {
      const res = await searchPoi(searchKeyword.trim(), { pageSize: 10 });
      setPoiResults(res.code === 200 && res.data ? res.data : []);
    } catch {
      setPoiResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchKeyword]);

  // 选中 POI ——逆地理编码后更新标记与地图
  const handleSelectPoi = useCallback(
    async (item: PoiItem) => {
      const [lng, lat] = item.location.split(',').map(Number);
      placeMarker(lng, lat);
      try {
        const res = await reGeocode(item.location);
        const addr = res.code === 200 && res.data ? res.data.formattedAddress : item.address;
        emit(addr || item.address, lng, lat);
      } catch {
        emit(item.address, lng, lat);
      }
      setPoiResults([]);
      setSearchKeyword(item.name);
    },
    [emit, placeMarker],
  );

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
            prefix={<Search size={14} color="#999" />}
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

      <Typography.Text type="secondary" className={styles.hintText}>
        搜索地址或直接点击地图选择位置
      </Typography.Text>
    </div>
  );
};

export default LocationPicker;
