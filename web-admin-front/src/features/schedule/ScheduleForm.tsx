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
import { Clock } from 'lucide-react';
import dayjs from 'dayjs';
import styles from './SchedulePage.module.css';

export const LANGUAGE_VERSIONS = [
  { value: 'chinese_2d', label: '国语 2D' },
  { value: 'chinese_3d', label: '国语 3D' },
  { value: 'chinese_imax', label: '国语 IMAX' },
  { value: 'english_2d', label: '英语 2D' },
  { value: 'english_3d', label: '英语 3D' },
  { value: 'english_imax', label: '英语 IMAX' },
  { value: 'japanese', label: '日语原声' },
  { value: 'korean', label: '韩语原声' },
];

export interface ScheduleFormData {
  cinemaId: string;
  hallId: string;
  movieId: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  vipPrice?: number;
  languageVersion: string;
}

export interface ScheduleFormErr {
  cinemaId?: string;
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
  cinemas: Array<{ id: string; name: string; branch?: string; address: string }>;
  halls: Array<{ id: string; cinemaId: string; name: string; totalSeats: number }>;
  movies: Array<{ id: string; name: string; duration: number; status: string }>;
}

export function ScheduleForm({ data, errors, onChange, cinemas, halls, movies }: ScheduleFormProps) {
  const updateField = (key: keyof ScheduleFormData, val: unknown) => {
    onChange({ ...data, [key]: val });
  };

  // 根据选中影院过滤影厅
  const cinemaHalls = useMemo(() => {
    return halls.filter(h => h.cinemaId === data.cinemaId);
  }, [halls, data.cinemaId]);

  // 切换影院自动填充第一个影厅
  useEffect(() => {
    if (data.cinemaId && cinemaHalls.length && !data.hallId) {
      updateField('hallId', cinemaHalls[0].id);
    }
  }, [data.cinemaId]);

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
      {/* 影院选择 */}
      <Form.Item
        label="选择影院"
        required
        validateStatus={errors.cinemaId ? 'error' : ''}
        help={errors.cinemaId}
        className={styles.formItem}
      >
        <Radio.Group
          value={data.cinemaId}
          onChange={(e) => updateField('cinemaId', e.target.value)}
        >
          <Space direction="vertical" size={8} className={styles.cinemaListSpace}>
            {cinemas.map(cinema => (
              <Radio key={cinema.id} value={cinema.id} className={styles.radioAlignStart}>
                <div>
                  <div className={styles.cinemaName}>{cinema.name} {cinema.branch}</div>
                  <div className={styles.cinemaAddress}>{cinema.address}</div>
                </div>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Form.Item>

      {/* 影厅选择 */}
      <Form.Item
        label="选择影厅"
        required
        validateStatus={errors.hallId ? 'error' : ''}
        help={errors.hallId}
        className={styles.formItem}
      >
        {!data.cinemaId ? (
          <div className={styles.placeholderHint}>请先选择影院</div>
        ) : cinemaHalls.length === 0 ? (
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
            <Clock size={16} color='#666' />
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
              <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      {/* VIP票价 */}
      <Form.Item label="VIP票价（选填）" className={styles.formItem}>
        <InputNumber
          addonBefore="¥"
          min={0.01}
          step={0.01}
          value={data.vipPrice}
          onChange={(v) => updateField('vipPrice', v)}
          placeholder="优惠价格，不填同原价"
          className={styles.fullWidth}
        />
      </Form.Item>
    </Form>
  );
}
