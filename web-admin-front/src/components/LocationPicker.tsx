import React, { useState, useCallback } from 'react';
import { Input, Button, Space, Typography, List, Spin } from 'antd';
import { MapPin, Search } from 'lucide-react';
import { searchPoi, reGeocode, type PoiItem } from '../services/amap';

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
 * 集成 WeaveFox 高德地图服务：
 * - POI 关键词搜索（输入影院名称 → 候选列表 → 点选回填）
 * - 手动输入经纬度作为降级方案
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
      if (res.code === 200 && res.data) {
        setPoiResults(res.data);
      } else {
        setPoiResults([]);
      }
    } catch {
      setPoiResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchKeyword]);

  // 选中 POI 结果
  const handleSelectPoi = useCallback(
    async (item: PoiItem) => {
      const [lng, lat] = item.location.split(',').map(Number);
      // 用逆地理编码获取结构化地址
      try {
        const res = await reGeocode(item.location);
        if (res.code === 200 && res.data) {
          emit(res.data.formattedAddress || item.address, lng, lat);
        } else {
          emit(item.address, lng, lat);
        }
      } catch {
        emit(item.address, lng, lat);
      }
      setPoiResults([]);
      setSearchKeyword(item.name);
    },
    [emit],
  );

  const handleAddressChange = useCallback(
    (v: string) => {
      setAddress(v);
      onChange?.({ address: v, longitude, latitude });
    },
    [longitude, latitude, onChange],
  );

  const handleLngChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLongitude(num);
      onChange?.({ address, longitude: num, latitude });
    },
    [address, latitude, onChange],
  );

  const handleLatChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLatitude(num);
      onChange?.({ address, longitude, latitude: num });
    },
    [address, longitude, onChange],
  );

  if (readonly) {
    return (
      <div style={{ padding: '12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>选中位置</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 14 }}>
          <MapPin size={16} color="#1677ff" />
          <span>{address || '未选择'}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          经度 {longitude.toFixed(7)} | 纬度 {latitude.toFixed(7)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* POI 搜索栏 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>搜索地点</div>
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

        {/* POI 搜索结果列表 */}
        {poiResults.length > 0 && (
          <List
            size="small"
            bordered
            style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}
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
                  title={<span style={{ fontSize: 14 }}>{item.name}</span>}
                  description={
                    <span style={{ fontSize: 12, color: '#999' }}>{item.address}</span>
                  }
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

      {/* 已选位置展示 */}
      {(address || longitude !== 0 || latitude !== 0) && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 8, border: '1px solid #d6e4ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={16} color="#1677ff" />
            <Typography.Text strong style={{ fontSize: 14 }}>{address || '坐标位置'}</Typography.Text>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {longitude.toFixed(6)}, {latitude.toFixed(6)}
          </Typography.Text>
        </div>
      )}

      {/* 手动输入（降级方案） */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>手动微调坐标</div>
        <Space size={12} style={{ width: '100%' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>经度</div>
            <Input
              value={longitude || ''}
              onChange={(e) => handleLngChange(e.target.value)}
              placeholder="-180 ~ 180"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>纬度</div>
            <Input
              value={latitude || ''}
              onChange={(e) => handleLatChange(e.target.value)}
              placeholder="-90 ~ 90"
            />
          </div>
        </Space>
      </div>

      {/* 详细地址 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>详细地址</div>
        <Input
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="省市区 + 详细地址"
          maxLength={200}
          prefix={<MapPin size={14} color="#999" />}
        />
      </div>
    </div>
  );
};

export default LocationPicker;
