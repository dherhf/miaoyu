import { useMemo } from 'react';
import { TeamOutlined } from '@ant-design/icons';
import { Form, Input, Button, Space, Typography, Card } from 'antd';
import type { FormInstance } from 'antd';
import { HALL_TYPES, generateSeats, countAvailableSeats } from './store';
import { SeatLayoutEditor } from './SeatLayoutEditor';
import styles from './HallPage.module.css';

/**
 * 影厅类型选择器组件
 * 以按钮组形式展示影厅类型选项（2D/3D/IMAX），
 * 兼容 antd Form 的 value/onChange 协议。
 */
function HallTypeSelect({ value, onChange }: { value?: string; onChange?: (val: string) => void }) {
  return (
    <Space wrap>
      {HALL_TYPES.map(t => (
        <Button
          key={t.value}
          type={value === t.value ? 'primary' : 'default'}
          onClick={() => onChange?.(t.value)}
        >{t.label}</Button>
      ))}
    </Space>
  );
}

/** 影厅表单组件属性 */
interface HallFormProps {
  /** antd Form 实例（由父组件控制） */
  form: FormInstance;
}

/**
 * 影厅新增/编辑表单组件
 *
 * 表单字段：
 * 1. 影厅名称（必填）
 * 2. 影厅类型（2D/3D/IMAX，必填）
 * 3. 座位布局编辑器（可添加/删除行列，切换可用/过道）
 *
 * 表单通过 Form.useWatch 监听 seats 字段变化，实时计算可用座位数
 */
export function HallForm({ form }: HallFormProps) {
  // 监听表单中的 seats 字段值
  const seats = Form.useWatch('seats', form);
  // 实时计算可用座位数
  const totalSeats = useMemo(() => seats ? countAvailableSeats(seats) : 0, [seats]);

  return (
    <Form
      form={form}
      layout='vertical'
      className={styles.hallForm}
      // 初始值：8行12列的默认座位布局
      initialValues={{ name: '', type: '', seats: generateSeats(8, 12) }}
    >
      {/* 影厅名称 */}
      <Form.Item label='影厅名称' name='name' rules={[{ required: true, message: '请输入影厅名称' }]}>
        <Input placeholder='IMAX 1号厅' />
      </Form.Item>
      {/* 影厅类型选择 */}
      <Form.Item label='影厅类型' name='type' rules={[{ required: true, message: '请选择影厅类型' }]}>
        <HallTypeSelect />
      </Form.Item>
      {/* 可用座位数统计 */}
      <Card size='small' styles={{ body: { padding: 12 } }}>
        <div className={styles.seatCountRow}>
          <Typography.Text className={styles.seatCountLabel}>预计可用座位</Typography.Text>
          <Space size={6}><TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} /><Typography.Text strong className={styles.seatCountValue}>{totalSeats} 座</Typography.Text></Space>
        </div>
      </Card>
      {/* 座位布局编辑器 */}
      <Form.Item label='座位布局编辑' name='seats' rules={[{ required: true, message: '请配置座位布局' }]}>
        <SeatLayoutEditor />
      </Form.Item>
    </Form>
  );
}
