import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Button, Space, List, Spin, Typography } from 'antd';
import { MapPin, Search } from 'lucide-react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { searchPoi, reGeocode, type PoiItem } from './api';

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
      key: import.meta.env.VITE_AMAP_JS_KEY || 'your_amap_js_key_here',
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

  // 同步外部 value
  useEffect(() => {
    if (value) {
      setAddress(value.address);
      setLongitude(value.longitude);
      setLatitude(value.latitude);
      // 移动地图标记
      if (mapRef.current && value.longitude && value.latitude) {
        mapRef.current.setZoomAndCenter(17, [value.longitude, value.latitude]);
        if (markerRef.current) {
          markerRef.current.setPosition([value.longitude, value.latitude]);
        }
      }
    }
  }, [value]);

  const emit = useCallback(
    (addr: string, lng: number, lat: number) => {
      setAddress(addr);
      setLongitude(lng);
      setLatitude(lat);
      onChange?.({ address: addr, longitude: lng, latitude: lat });
    },
    [onChange],
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
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
      <div style={{ marginBottom: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
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
            style={{ marginTop: 8, maxHeight: 180, overflow: 'auto' }}
            dataSource={poiResults}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => handleSelectPoi(item)}
                style={{ cursor: 'pointer', padding: '8px 12px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f5ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <List.Item.Meta
                  title={<span style={{ fontSize: 13 }}>{item.name}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>{item.address}</span>}
                />
              </List.Item>
            )}
          />
        )}
        {searching && (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <Spin size="small" />
          </div>
        )}
      </div>

      {/* 地图区域 */}
      <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
        {/* SDK 加载中的占位 */}
        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: '#f0f2f5', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Spin size="small" />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>地图加载中...</Typography.Text>
          </div>
        )}
        {/* 地图容器 */}
        <div id={containerId.current} style={{ width: '100%', height: '100%' }} />

        {/* 已选位置信息浮层 */}
        {hasLocation && mapReady && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 10,
            background: 'rgba(255,255,255,0.95)', borderRadius: 6,
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12,
          }}>
            <MapPin size={14} color="#1677ff" />
            <span style={{ flex: 1, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {address}
            </span>
            <span style={{ color: '#999', whiteSpace: 'nowrap' }}>
              {longitude.toFixed(6)}, {latitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
        搜索地址或直接点击地图选择位置
      </Typography.Text>
    </div>
  );
};

export default LocationPicker;
