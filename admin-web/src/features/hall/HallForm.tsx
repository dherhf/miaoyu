import { useMemo } from 'react';
import { TeamOutlined } from '@ant-design/icons';
import { Form, Input, Button, Space, Typography, Card } from 'antd';
import type { FormInstance } from 'antd';
import { HALL_TYPES, generateSeats, countAvailableSeats } from './store';
import { SeatLayoutEditor } from './SeatLayoutEditor';
import styles from './HallPage.module.css';

/** 影厅类型选择器（antd Form 兼容：value/onChange） */
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

interface HallFormProps {
  form: FormInstance;
}

export function HallForm({ form }: HallFormProps) {
  const seats = Form.useWatch('seats', form);
  const totalSeats = useMemo(() => seats ? countAvailableSeats(seats) : 0, [seats]);

  return (
    <Form
      form={form}
      layout='vertical'
      className={styles.hallForm}
      initialValues={{ name: '', type: '', seats: generateSeats(8, 12) }}
    >
      <Form.Item label='影厅名称' name='name' rules={[{ required: true, message: '请输入影厅名称' }]}>
        <Input placeholder='IMAX 1号厅' />
      </Form.Item>
      <Form.Item label='影厅类型' name='type' rules={[{ required: true, message: '请选择影厅类型' }]}>
        <HallTypeSelect />
      </Form.Item>
      <Card size='small' styles={{ body: { padding: 12 } }}>
        <div className={styles.seatCountRow}>
          <Typography.Text className={styles.seatCountLabel}>预计可用座位</Typography.Text>
          <Space size={6}><TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} /><Typography.Text strong className={styles.seatCountValue}>{totalSeats} 座</Typography.Text></Space>
        </div>
      </Card>
      <Form.Item label='座位布局编辑' name='seats' rules={[{ required: true, message: '请配置座位布局' }]}>
        <SeatLayoutEditor />
      </Form.Item>
    </Form>
  );
}
