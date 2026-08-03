import React, { useState, useCallback } from 'react';
import { Input, Button, Space, List, Spin, Typography } from 'antd';
import { MapPin, Search } from 'lucide-react';
import { searchPoi, reGeocode, type PoiItem } from '../api/amap';

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

/**
 * 地图选点组件
 * - 搜索输入框 + 搜索按钮 + 地图画布占位区
 * - POI 搜索 → 候选列表点选 → 自动回填 address/lng/lat
 * - 地图画布展示已选位置的坐标信息
 * - 不暴露经纬度输入框
 */
const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, readonly = false }) => {
  const [address, setAddress] = useState(value?.address ?? '');
  const [longitude, setLongitude] = useState(value?.longitude ?? 0);
  const [latitude, setLatitude] = useState(value?.latitude ?? 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [poiResults, setPoiResults] = useState<PoiItem[]>([]);

  // 同步外部 value
  React.useEffect(() => {
    if (value) {
      setAddress(value.address);
      setLongitude(value.longitude);
      setLatitude(value.latitude);
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

  // 选中 POI
  const handleSelectPoi = useCallback(
    async (item: PoiItem) => {
      const [lng, lat] = item.location.split(',').map(Number);
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
    [emit],
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

      {/* 地图画布占位区 */}
      <div
        style={{
          width: '100%',
          height: 200,
          background: '#f0f2f5',
          borderRadius: 8,
          border: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <MapPin size={36} color={hasLocation ? '#1677ff' : '#bfbfbf'} />
        {hasLocation ? (
          <>
            <Typography.Text style={{ fontSize: 13, color: '#1677ff', fontWeight: 500 }}>
              {address}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {longitude.toFixed(6)}, {latitude.toFixed(6)}
            </Typography.Text>
          </>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            搜索地点或点击地图选点（高德 SDK 待集成）
          </Typography.Text>
        )}

        {/* 十字准心 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 24,
            height: 24,
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#1677ff', opacity: 0.4 }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#1677ff', opacity: 0.4 }} />
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
