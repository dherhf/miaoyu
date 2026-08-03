import { Form, Input, InputNumber, Radio, Tag, Space } from 'antd';
import { MapPin, Phone } from 'lucide-react';
import { LocationPicker } from '../amap';
import type { CinemaStatus } from './types';
import styles from './CinemaPage.module.css';

// ====================== 类型定义 ======================
const CINEMA_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
} as const;

interface CinemaFormValues {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities: string[];
  rating: number | null;
  phone: string | null;
  status: CinemaStatus;
}

const CINEMA_STATUS_LABELS = {
  [CINEMA_STATUS.ACTIVE]: { label: '营业中', color: 'green' },
  [CINEMA_STATUS.CLOSED]: { label: '停业', color: 'gray' },
};

const FACILITY_TAGS = [
  'IMAX',
  '杜比',
  '4DX',
  '巨幕厅',
  'Dolby Atmos',
  'Reald 3D',
  '儿童厅',
  'VIP厅',
];

// ====================== 表单子组件 ======================
interface CinemaFormProps {
  data: CinemaFormValues;
  isEdit: boolean;
  onChange: (vals: CinemaFormValues) => void;
}
export function CinemaForm({ data, isEdit, onChange }: CinemaFormProps) {
  const handleFieldChange = (field: keyof CinemaFormValues, val: unknown) => {
    onChange({ ...data, [field]: val });
  };

  // 切换设施标签
  const toggleFacility = (tag: string) => {
    const list = [...data.facilities];
    const idx = list.indexOf(tag);
    if (idx > -1) list.splice(idx, 1);
    else list.push(tag);
    handleFieldChange('facilities', list);
  };

  return (
    <Form layout="vertical" className={styles.form}>
      {/* 影院名称 */}
      <Form.Item label="影院名称" name="name" rules={[{ required: true, max: 50, message: '名称1-50字符' }]}>
        <Input
          value={data.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="请输入影院名称"
        />
      </Form.Item>

      {/* 地图选址：搜索框+搜索按钮+地图画布 */}
      <Form.Item label="地图选址" required>
        <LocationPicker
          value={{ address: data.address, longitude: data.longitude, latitude: data.latitude }}
          onChange={(loc) => {
            handleFieldChange('address', loc.address);
            handleFieldChange('longitude', loc.longitude);
            handleFieldChange('latitude', loc.latitude);
          }}
        />
      </Form.Item>

      {/* 详细地址：地图选点后自动回填，也可手动修改 */}
      <Form.Item label="详细地址" name="address" rules={[{ required: true, message: '请选择地址' }]}>
        <Input
          value={data.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="地图选点后自动回填"
          maxLength={200}
          prefix={<MapPin size={14} />}
        />
      </Form.Item>

      {/* 设施标签多选 */}
      <Form.Item label="设施标签">
        <Space wrap size={8}>
          {FACILITY_TAGS.map((tag) => (
            <Tag
              key={tag}
              onClick={() => toggleFacility(tag)}
              color={data.facilities.includes(tag) ? 'blue' : undefined}
              className={styles.facilityTag}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      </Form.Item>

      {/* 评分 & 电话 */}
      <Space size={16} className={styles.ratingPhoneRow}>
        <Form.Item label="评分" className={styles.formCol}>
          <InputNumber
            min={0}
            max={10}
            step={0.1}
            value={data.rating}
            onChange={(v) => handleFieldChange('rating', v)}
            placeholder="0-10"
            className={styles.fullWidth}
          />
        </Form.Item>
        <Form.Item label="联系电话" className={styles.formCol}>
          <Input
            value={data.phone ?? ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="010-xxxxxxx"
            prefix={<Phone size={14} />}
          />
        </Form.Item>
      </Space>

      {/* 营业状态 */}
      <Form.Item label="营业状态">
        {isEdit ? (
          <Radio.Group
            value={data.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
          >
            <Radio value={CINEMA_STATUS.ACTIVE}>营业中</Radio>
            <Radio value={CINEMA_STATUS.CLOSED}>停业</Radio>
          </Radio.Group>
        ) : (
          <Tag color="green">营业中（新建默认）</Tag>
        )}
      </Form.Item>
    </Form>
  );
}

export { CINEMA_STATUS, CINEMA_STATUS_LABELS };
export type { CinemaFormValues };
