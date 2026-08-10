import { useMemo, useEffect } from 'react';
import {
  Form,
  Select,
  InputNumber,
  DatePicker,
  TimePicker,
  Radio,
  Space,
} from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './SchedulePage.module.css';

export const LANGUAGE_VERSIONS = ['国语 2D', '国语 3D', '国语 IMAX', '英语 2D', '英语 3D', '英语 IMAX', '日语原声', '韩语原声'];

export interface ScheduleFormData {
  cinemaId: string;
  hallId: string;
  movieId: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  languageVersion: string;
}

export interface ScheduleFormErr {
  hallId?: string;
  movieId?: string;
  showDate?: string;
  showTime?: string;
  price?: string;
  languageVersion?: string;
}

interface ScheduleFormProps {
  data: ScheduleFormData;
  errors: ScheduleFormErr;
  onChange: (vals: ScheduleFormData) => void;
  halls: Array<{ id: string; cinemaId: string; name: string; totalSeats: number }>;
  movies: Array<{ id: string; name: string; duration: number; status: string }>;
}

export function ScheduleForm({ data, errors, onChange, halls, movies }: ScheduleFormProps) {
  const updateField = (key: keyof ScheduleFormData, val: unknown) => {
    onChange({ ...data, [key]: val });
  };

  // 根据选中影院过滤影厅
  const cinemaHalls = useMemo(() => {
    return halls.filter(h => h.cinemaId === data.cinemaId);
  }, [halls, data.cinemaId]);

  // 自动选中第一个影厅
  useEffect(() => {
    if (data.cinemaId && cinemaHalls.length && !data.hallId) {
      updateField('hallId', cinemaHalls[0].id);
    }
  }, [data.cinemaId, cinemaHalls, data.hallId]);

  // 根据影片时长自动计算结束时间
  useEffect(() => {
    const targetMovie = movies.find(m => m.id === data.movieId);
    if (!targetMovie || !data.showDate || !data.showTime) return;
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(targetMovie.duration, 'minute');
    updateField('endTime', end.format('HH:mm'));
  }, [data.movieId, data.showDate, data.showTime, movies]);

  return (
    <Form layout="vertical">
      {/* 影厅选择 */}
      <Form.Item
        label="选择影厅"
        required
        validateStatus={errors.hallId ? 'error' : ''}
        help={errors.hallId}
        className={styles.formItem}
      >
        {cinemaHalls.length === 0 ? (
          <div className={styles.placeholderHint}>该影院暂无可用影厅</div>
        ) : (
          <Radio.Group value={data.hallId} onChange={(e) => updateField('hallId', e.target.value)}>
            <Space wrap size={8}>
              {cinemaHalls.map(hall => (
                <Radio key={hall.id} value={hall.id}>{hall.name}</Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Form.Item>

      {/* 影片下拉 */}
      <Form.Item
        label="选择影片"
        required
        validateStatus={errors.movieId ? 'error' : ''}
        help={errors.movieId}
        className={styles.formItem}
      >
        <Select
          placeholder="请选择影片"
          value={data.movieId || undefined}
          onChange={(v) => updateField('movieId', v)}
          className={styles.fullWidth}
        >
          {movies.filter(m => m.status === 'showing' || m.status === 'coming').map(movie => (
            <Select.Option key={movie.id} value={movie.id}>
              {movie.name}（{movie.duration}分钟）
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* 日期 + 时间 双栏 */}
      <div className={styles.twoColWrap}>
        <Form.Item
          label="放映日期"
          required
          validateStatus={errors.showDate ? 'error' : ''}
          help={errors.showDate}
          className={styles.colItem}
        >
          <DatePicker
            value={data.showDate ? dayjs(data.showDate) : undefined}
            onChange={(d) => updateField('showDate', d?.format('YYYY-MM-DD'))}
            disabledDate={(d) => d.isBefore(dayjs().subtract(1, 'day'))}
            className={styles.fullWidth}
          />
        </Form.Item>
        <Form.Item
          label="开始时间"
          required
          validateStatus={errors.showTime ? 'error' : ''}
          help={errors.showTime}
          className={styles.colItem}
        >
          <TimePicker
            value={data.showTime ? dayjs(`2000-01-01 ${data.showTime}`) : undefined}
            onChange={(t) => updateField('showTime', t?.format('HH:mm'))}
            format="HH:mm"
            className={styles.fullWidth}
          />
        </Form.Item>
      </div>

      {/* 自动计算结束时间 */}
      {data.endTime && (
        <div className={styles.endTimeBar}>
          <span className={styles.endTimeLabel}>预计结束时间</span>
          <Space size={4}>
            <ClockCircleOutlined style={{ fontSize: 16, color: '#666' }} />
            <span className={styles.endTimeValue}>{data.endTime}</span>
          </Space>
        </div>
      )}

      {/* 票价 & 语言版本 */}
      <div className={styles.twoColWrap}>
        <Form.Item
          label="票价"
          required
          validateStatus={errors.price ? 'error' : ''}
          help={errors.price}
          className={styles.colItem}
        >
          <InputNumber
            addonBefore="¥"
            min={0.01}
            step={0.01}
            value={data.price}
            onChange={(v) => updateField('price', v)}
            className={styles.fullWidth}
            placeholder="0.00"
          />
        </Form.Item>
        <Form.Item
          label="语言版本"
          required
          validateStatus={errors.languageVersion ? 'error' : ''}
          help={errors.languageVersion}
          className={styles.colItem}
        >
          <Select
            placeholder="请选择"
            value={data.languageVersion}
            onChange={(v) => updateField('languageVersion', v)}
            className={styles.fullWidth}
          >
            {LANGUAGE_VERSIONS.map(item => (
              <Select.Option key={item} value={item}>{item}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>

    </Form>
  );
}
