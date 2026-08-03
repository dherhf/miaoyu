import React, { useState, useCallback } from 'react';
import { Input, Space, Button, Typography } from 'antd';
import { MapPin, Navigation } from 'lucide-react';

export interface Coordinate {
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
}

export interface MapPickerProps {
  /** 当前位置（编辑模式下回填） */
  value?: Coordinate;
  /** 值变更回调 */
  onChange?: (coord: Coordinate) => void;
  /** 地图高度 */
  height?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 默认中心点（新增模式下的初始位置） */
  defaultCenter?: Coordinate;
}

/**
 * 地图选点组件（基础版）
 *
 * 提供手动输入经纬度的降级方案。
 * 集成高德/百度地图 SDK 后，替换为内嵌地图 + 点击打点 + 拖拽交互。
 *
 * @example
 * <MapPicker
 *   value={{ lng: 116.4731, lat: 39.9087 }}
 *   onChange={(c) => setCoordinates(c)}
 * />
 */
const MapPicker: React.FC<MapPickerProps> = ({
  value,
  onChange,
  height = 320,
  disabled = false,
  defaultCenter = { lng: 116.4074, lat: 39.9042 }, // 北京
}) => {
  const [lng, setLng] = useState<number>(value?.lng ?? defaultCenter.lng);
  const [lat, setLat] = useState<number>(value?.lat ?? defaultCenter.lat);

  // 同步外部 value
  React.useEffect(() => {
    if (value) {
      setLng(value.lng);
      setLat(value.lat);
    }
  }, [value]);

  const handleLngChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLng(num);
      onChange?.({ lng: num, lat });
    },
    [lat, onChange],
  );

  const handleLatChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLat(num);
      onChange?.({ lng, lat: num });
    },
    [lng, onChange],
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord: Coordinate = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        };
        setLng(coord.lng);
        setLat(coord.lat);
        onChange?.(coord);
      },
      () => {
        // 定位失败静默
      },
    );
  }, [onChange]);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  };

  return (
    <div>
      {/* 地图占位区 */}
      <div
        style={{
          width: '100%',
          height,
          background: '#f0f2f5',
          borderRadius: 8,
          border: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <MapPin size={40} color="#bfbfbf" />
        <Typography.Text type="secondary" style={{ fontSize: 14 }}>
          地图组件待集成（高德/百度 SDK）
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          当前为手动输入坐标模式
        </Typography.Text>
        {!disabled && (
          <Button
            size="small"
            icon={<Navigation size={14} />}
            onClick={useCurrentLocation}
          >
            使用当前位置
          </Button>
        )}
        {/* 坐标展示 */}
        {lng !== 0 && lat !== 0 && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 16px',
              background: '#fff',
              borderRadius: 6,
              border: '1px solid #e8e8e8',
              fontSize: 13,
              color: '#1677ff',
              fontWeight: 500,
            }}
          >
            {lng.toFixed(6)}, {lat.toFixed(6)}
          </div>
        )}
      </div>

      {/* 手动坐标输入 */}
      <Space size={12} style={{ width: '100%' }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>经度 (Longitude)</div>
          <Input
            value={lng || ''}
            onChange={(e) => handleLngChange(e.target.value)}
            disabled={disabled}
            placeholder="-180 ~ 180"
            type="number"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>纬度 (Latitude)</div>
          <Input
            value={lat || ''}
            onChange={(e) => handleLatChange(e.target.value)}
            disabled={disabled}
            placeholder="-90 ~ 90"
            type="number"
          />
        </div>
      </Space>
    </div>
  );
};

export default MapPicker;
