import { Form, Input, InputNumber, Tag, Space } from 'antd';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import { LocationPicker } from '../amap';
import styles from './CinemaPage.module.css';

/**
 * 影院状态常量
 * active: 营业中 / closed: 停业
 */
const CINEMA_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
} as const;

/**
 * 影院表单值
 * 用于新增/编辑影院时的表单数据
 */
interface CinemaFormValues {
  /** 影院名称 */
  name: string;
  /** 详细地址 */
  address: string;
  /** 经度 */
  longitude: number;
  /** 纬度 */
  latitude: number;
  /** 设施标签列表（如 IMAX、杜比等） */
  facilities: string[];
  /** 评分（0-10） */
  rating: number | null;
  /** 联系电话 */
  phone: string | null;
}

/**
 * 影院状态标签配置
 * 用于在 UI 中显示状态颜色和文案
 */
const CINEMA_STATUS_LABELS = {
  [CINEMA_STATUS.ACTIVE]: { label: '营业中', color: 'green' },
  [CINEMA_STATUS.CLOSED]: { label: '停业', color: 'gray' },
};

/**
 * 影院设施标签列表
 * 用户在表单中通过点击标签来选择影院支持的设施
 */
const FACILITY_TAGS = [
  'IMAX',
  '杜比',
  '4DX',
  '巨幕厅',
  'Dolby Atmos',
  'Reald 3D',
  'VIP厅',
];

/**
 * 影院表单子组件属性
 */
interface CinemaFormProps {
  /** 当前表单数据 */
  data: CinemaFormValues;
  /** 是否编辑模式（true=编辑，false=新增） */
  isEdit: boolean;
  /** 表单数据变更回调 */
  onChange: (vals: CinemaFormValues) => void;
}

/**
 * 影院新增/编辑表单组件
 *
 * 表单字段：
 * 1. 影院名称（必填）
 * 2. 地图选址（高德地图选点，搜索 + 点击地图）
 * 3. 详细地址（地图选点后自动回填，可手动修改）
 * 4. 设施标签（多选，点击切换）
 * 5. 评分（0-10）和联系电话
 */
export function CinemaForm({ data, onChange }: CinemaFormProps) {
  /**
   * 通用字段变更处理
   * 更新指定字段的值并通知父组件
   */
  const handleFieldChange = (field: keyof CinemaFormValues, val: unknown) => {
    onChange({ ...data, [field]: val });
  };

  /**
   * 切换设施标签选中状态
   * 已选中的标签再次点击则取消选中，未选中的点击则选中
   */
  const toggleFacility = (tag: string) => {
    const list = [...data.facilities];
    const idx = list.indexOf(tag);
    if (idx > -1) list.splice(idx, 1);  // 已选中：移除
    else list.push(tag);                  // 未选中：添加
    handleFieldChange('facilities', list);
  };

  return (
    <Form layout="vertical" className={styles.form}>
      {/* 影院名称输入 */}
      <Form.Item label="影院名称" required>
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
            onChange({ ...data, address: loc.address, longitude: loc.longitude, latitude: loc.latitude });
          }}
        />
      </Form.Item>

      {/* 详细地址：地图选点后自动回填，也可手动修改 */}
      <Form.Item label="详细地址" required>
        <Input
          value={data.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="地图选点后自动回填"
          maxLength={200}
          prefix={<EnvironmentOutlined />}
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

      {/* 评分 & 电话 双栏 */}
      <div className={styles.ratingPhoneRow}>
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
            prefix={<PhoneOutlined />}
          />
        </Form.Item>
      </div>
    </Form>
  );
}

// 导出状态常量和表单值类型
export { CINEMA_STATUS, CINEMA_STATUS_LABELS };
export type { CinemaFormValues };
