import React, { useState, useCallback } from 'react';
import { Input, Space, Button, Typography } from 'antd';
import { MapPin, Navigation } from 'lucide-react';
import styles from './MapPicker.module.css';

/** 经纬度坐标 */
export interface Coordinate {
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
}

/** 地图选点组件属性 */
export interface MapPickerProps {
  /** 当前位置（编辑模式下回填） */
  value?: Coordinate;
  /** 值变更回调 */
  onChange?: (coord: Coordinate) => void;
  /** 地图区域高度 */
  height?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 默认中心点（新增模式下的初始位置，默认北京） */
  defaultCenter?: Coordinate;
}

/**
 * 地图选点组件（基础版）
 *
 * 提供手动输入经纬度的降级方案。
 * 集成高德/百度地图 SDK 后，替换为内嵌地图 + 点击打点 + 拖拽交互。
 * 支持"使用当前位置"通过浏览器 Geolocation API 获取设备坐标。
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
  defaultCenter = { lng: 116.4074, lat: 39.9042 }, // 默认北京天安门
}) => {
  // 经度状态
  const [lng, setLng] = useState<number>(value?.lng ?? defaultCenter.lng);
  // 纬度状态
  const [lat, setLat] = useState<number>(value?.lat ?? defaultCenter.lat);

  // 同步外部 value 变化（编辑模式回填）
  React.useEffect(() => {
    if (value) {
      setLng(value.lng);
      setLat(value.lat);
    }
  }, [value]);

  /**
   * 经度变化处理
   * 解析输入值为数字，更新状态并通知外部
   */
  const handleLngChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLng(num);
      onChange?.({ lng: num, lat });
    },
    [lat, onChange],
  );

  /**
   * 纬度变化处理
   * 解析输入值为数字，更新状态并通知外部
   */
  const handleLatChange = useCallback(
    (v: string) => {
      const num = parseFloat(v) || 0;
      setLat(num);
      onChange?.({ lng, lat: num });
    },
    [lng, onChange],
  );

  /**
   * 使用浏览器 Geolocation API 获取当前位置
   * 成功后更新经纬度并通知外部，失败时静默处理
   */
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
        // 定位失败静默处理
      },
    );
  }, [onChange]);

  return (
    <div>
      {/* 地图占位区（待集成高德/百度 SDK） */}
      <div
        className={styles.mapPlaceholder}
        style={{ height }}
      >
        <MapPin size={40} color="#bfbfbf" />
        <Typography.Text type="secondary" className={styles.mapHint}>
          地图组件待集成（高德/百度 SDK）
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.mapSubHint}>
          当前为手动输入坐标模式
        </Typography.Text>
        {/* 未禁用时显示"使用当前位置"按钮 */}
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
          <div className={styles.coordinateDisplay}>
            {lng.toFixed(6)}, {lat.toFixed(6)}
          </div>
        )}
      </div>

      {/* 手动坐标输入区域 */}
      <Space size={12} className={styles.inputRow}>
        <div className={styles.inputCol}>
          <div className={styles.label}>经度 (Longitude)</div>
          <Input
            value={lng || ''}
            onChange={(e) => handleLngChange(e.target.value)}
            disabled={disabled}
            placeholder="-180 ~ 180"
            type="number"
          />
        </div>
        <div className={styles.inputCol}>
          <div className={styles.label}>纬度 (Latitude)</div>
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
