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

/**
 * 语言版本选项列表
 * 用于场次排片时选择影片的语言版本
 */
export const LANGUAGE_VERSIONS = [
  '国语 2D', '国语 3D', '国语 IMAX',
  '英语 2D', '英语 3D', '英语 IMAX',
  '日语原声', '韩语原声',
];

/**
 * 排期表单数据
 * 用于新增/编辑排期时的表单数据
 */
export interface ScheduleFormData {
  /** 影院 ID */
  cinemaId: string;
  /** 影厅 ID */
  hallId: string;
  /** 影片 ID */
  movieId: string;
  /** 放映日期（YYYY-MM-DD） */
  showDate: string;
  /** 开始时间（HH:mm） */
  showTime: string;
  /** 结束时间（HH:mm，自动计算） */
  endTime: string;
  /** 票价（元） */
  price: number;
  /** 语言版本 */
  languageVersion: string;
}

/**
 * 表单校验错误信息
 */
export interface ScheduleFormErr {
  /** 影厅错误 */
  hallId?: string;
  /** 影片错误 */
  movieId?: string;
  /** 日期错误 */
  showDate?: string;
  /** 时间错误 */
  showTime?: string;
  /** 票价错误 */
  price?: string;
  /** 语言版本错误 */
  languageVersion?: string;
}

/**
 * 排期表单组件属性
 */
interface ScheduleFormProps {
  /** 当前表单数据 */
  data: ScheduleFormData;
  /** 校验错误信息 */
  errors: ScheduleFormErr;
  /** 表单数据变更回调 */
  onChange: (vals: ScheduleFormData) => void;
  /** 可选影厅列表（已按影院过滤） */
  halls: Array<{ id: string; cinemaId: string; name: string; totalSeats: number }>;
  /** 可选影片列表 */
  movies: Array<{ id: string; name: string; duration: number; status: string }>;
}

/**
 * 排期表单组件
 *
 * 表单字段：
 * 1. 影厅选择（根据选中影院过滤，Radio 按钮组）
 * 2. 影片选择（下拉，仅显示上架影片）
 * 3. 放映日期 + 开始时间
 * 4. 结束时间（根据影片时长自动计算）
 * 5. 票价 + 语言版本
 *
 * 自动行为：
 * - 选中影院后自动选中第一个影厅
 * - 选择影片和时间后自动计算结束时间
 */
export function ScheduleForm({ data, errors, onChange, halls, movies }: ScheduleFormProps) {
  /**
   * 通用字段更新
   * 更新指定字段的值并通知父组件
   */
  const updateField = (key: keyof ScheduleFormData, val: unknown) => {
    onChange({ ...data, [key]: val });
  };

  // 根据选中影院过滤影厅列表
  const cinemaHalls = useMemo(() => {
    return halls.filter(h => h.cinemaId === data.cinemaId);
  }, [halls, data.cinemaId]);

  // 自动选中第一个影厅（选中影院后未选影厅时）
  useEffect(() => {
    if (data.cinemaId && cinemaHalls.length && !data.hallId) {
      updateField('hallId', cinemaHalls[0].id);
    }
  }, [data.cinemaId, cinemaHalls, data.hallId]);

  // 根据影片时长自动计算结束时间
  useEffect(() => {
    const targetMovie = movies.find(m => m.id === data.movieId);
    if (!targetMovie || !data.showDate || !data.showTime) return;
    // 开始时间 + 影片时长 = 结束时间
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(targetMovie.duration, 'minute');
    updateField('endTime', end.format('HH:mm'));
  }, [data.movieId, data.showDate, data.showTime, movies]);

  return (
    <Form layout="vertical">
      {/* 影厅选择（Radio 按钮组，按影院过滤） */}
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

      {/* 影片下拉选择（仅显示上架影片） */}
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

      {/* 放映日期 + 开始时间 双栏 */}
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
            // 不允许选择今天之前的日期
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

      {/* 自动计算的结束时间展示 */}
      {data.endTime && (
        <div className={styles.endTimeBar}>
          <span className={styles.endTimeLabel}>预计结束时间</span>
          <Space size={4}>
            <Clock size={16} color='#666' />
            <span className={styles.endTimeValue}>{data.endTime}</span>
          </Space>
        </div>
      )}

      {/* 票价 + 语言版本 双栏 */}
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
