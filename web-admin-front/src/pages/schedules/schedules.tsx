import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Armchair,
  ArrowLeft,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import {
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  TimePicker,
  Radio,
  Button,
  Space,
  Tag,
  Card,
  message,
} from 'antd';
import type { TableProps, ModalProps, FormProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useCinemaStore,
  useMovieStore,
  useHallStore,
  useScheduleStore,
  useOrderStore,
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from '../../stores';

// ===================== 常量与TS类型 =====================
const LANGUAGE_VERSIONS = [
  { value: 'chinese_2d', label: '国语 2D' },
  { value: 'chinese_3d', label: '国语 3D' },
  { value: 'chinese_imax', label: '国语 IMAX' },
  { value: 'english_2d', label: '英语 2D' },
  { value: 'english_3d', label: '英语 3D' },
  { value: 'english_imax', label: '英语 IMAX' },
  { value: 'japanese', label: '日语原声' },
  { value: 'korean', label: '韩语原声' },
];

type ScheduleStatus = 'available' | 'full' | 'ended' | 'cancelled';
interface ScheduleItem {
  id: string | number;
  cinemaId: string | number;
  cinemaName: string;
  hallId: string | number;
  hallName: string;
  movieId: string | number;
  movieName: string;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  vipPrice?: number;
  languageVersion: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
}
interface ScheduleFormData {
  cinemaId: string | number;
  hallId: string | number;
  movieId: string | number;
  showDate: string;
  showTime: string;
  endTime: string;
  price: number;
  vipPrice?: number;
  languageVersion: string;
}
interface ScheduleFormErr {
  cinemaId?: string;
  hallId?: string;
  movieId?: string;
  showDate?: string;
  showTime?: string;
  price?: string;
  languageVersion?: string;
}

// ===================== 排期表单子组件 =====================
interface ScheduleFormProps {
  data: ScheduleFormData;
  errors: ScheduleFormErr;
  onChange: (vals: ScheduleFormData) => void;
  cinemas: Array<{ id: string | number; name: string; branch: string; address: string }>;
  halls: Array<{ id: string | number; cinemaId: string | number; name: string; totalSeats: number }>;
  movies: Array<{ id: string | number; name: string; duration: number; status: string }>;
}
const ScheduleForm: React.FC<ScheduleFormProps> = ({ data, errors, onChange, cinemas, halls, movies }) => {
  const updateField = (key: keyof ScheduleFormData, val: any) => {
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
    const [h, m] = data.showTime.split(':').map(Number);
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(target.duration, 'minute');
    updateField('endTime', end.format('HH:mm'));
  }, [data.movieId, data.showDate, data.showTime, movies]);

  const formItemStyle: React.CSSProperties = { marginBottom: 16 };
  const twoColWrap: React.CSSProperties = { display: 'flex', gap: 16 };
  const colItem: React.CSSProperties = { flex: 1 };

  return (
    <Form layout="vertical">
      {/* 影院选择 */}
      <Form.Item
        label="选择影院"
        required
        validateStatus={errors.cinemaId ? 'error' : ''}
        help={errors.cinemaId}
        style={formItemStyle}
      >
        <Radio.Group
          value={data.cinemaId}
          onChange={(e) => updateField('cinemaId', e.target.value)}
        >
          <Space direction="vertical" size={8} style={{ maxHeight: 150, overflow: 'auto', border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
            {cinemas.map(cinema => (
              <Radio key={cinema.id} value={cinema.id} style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{cinema.name} {cinema.branch}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{cinema.address}</div>
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
        style={formItemStyle}
      >
        {!data.cinemaId ? (
          <div style={{ fontSize: 14, color: '#999' }}>请先选择影院</div>
        ) : cinemaHalls.length === 0 ? (
          <div style={{ fontSize: 14, color: '#999' }}>该影院暂无可用影厅</div>
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
        style={formItemStyle}
      >
        <Select
          placeholder="请选择影片"
          value={data.movieId || undefined}
          onChange={(v) => updateField('movieId', v)}
          style={{ width: '100%' }}
        >
          {movies.filter(m => m.status === 'showing' || m.status === 'coming').map(movie => (
            <Select.Option key={movie.id} value={movie.id}>
              {movie.name}（{movie.duration}分钟）
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* 日期 + 时间 双栏 */}
      <div style={twoColWrap}>
        <Form.Item
          label="放映日期"
          required
          validateStatus={errors.showDate ? 'error' : ''}
          help={errors.showDate}
          style={colItem}
        >
          <DatePicker
            value={data.showDate ? dayjs(data.showDate) : undefined}
            onChange={(d) => updateField('showDate', d?.format('YYYY-MM-DD'))}
            disabledDate={(d) => d.isBefore(dayjs().subtract(1, 'day'))}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          label="开始时间"
          required
          validateStatus={errors.showTime ? 'error' : ''}
          help={errors.showTime}
          style={colItem}
        >
          <TimePicker
            value={data.showTime ? dayjs(`2000-01-01 ${data.showTime}`) : undefined}
            onChange={(t) => updateField('showTime', t?.format('HH:mm'))}
            format="HH:mm"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </div>

      {/* 自动计算结束时间 */}
      {data.endTime && (
        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#666' }}>预计结束时间</span>
          <Space size={4}>
            <Clock size={16} color='#666' />
            <span style={{ fontWeight: 500 }}>{data.endTime}</span>
          </Space>
        </div>
      )}

      {/* 票价 & 语言版本 */}
      <div style={twoColWrap}>
        <Form.Item
          label="票价"
          required
          validateStatus={errors.price ? 'error' : ''}
          help={errors.price}
          style={colItem}
        >
          <InputNumber
            addonBefore="¥"
            min={0.01}
            step={0.01}
            value={data.price}
            onChange={(v) => updateField('price', v)}
            style={{ width: '100%' }}
            placeholder="0.00"
          />
        </Form.Item>
        <Form.Item
          label="语言版本"
          required
          validateStatus={errors.languageVersion ? 'error' : ''}
          help={errors.languageVersion}
          style={colItem}
        >
          <Select
            placeholder="请选择"
            value={data.languageVersion}
            onChange={(v) => updateField('languageVersion', v)}
            style={{ width: '100%' }}
          >
            {LANGUAGE_VERSIONS.map(item => (
              <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      {/* VIP票价 */}
      <Form.Item label="VIP票价（选填）" style={formItemStyle}>
        <InputNumber
          addonBefore="¥"
          min={0.01}
          step={0.01}
          value={data.vipPrice}
          onChange={(v) => updateField('vipPrice', v)}
          placeholder="优惠价格，不填同原价"
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Form>
  );
};

// ===================== 主页面 Schedule排期管理 =====================
const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cinemaStore = useCinemaStore();
  const movieStore = useMovieStore();
  const hallStore = useHallStore();
  const scheduleStore = useScheduleStore();
  const orderStore = useOrderStore();

  // URL影院参数
  const cinemaIdParam = searchParams.get('cinemaId');
  const [selectedCinemaId, setSelectedCinemaId] = useState<string | number>(cinemaIdParam ?? '');

  // 筛选状态
  const [keyword, setKeyword] = useState('');
  const [movieFilter, setMovieFilter] = useState<string>();
  const [hallFilter, setHallFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    cinemaId: '',
    hallId: '',
    movieId: '',
    showDate: '',
    showTime: '',
    endTime: '',
    price: 0,
    vipPrice: undefined,
    languageVersion: 'chinese_2d',
  });
  const [formErrors, setFormErrors] = useState<ScheduleFormErr>({});

  // 同步URL影院参数
  useEffect(() => {
    if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam);
  }, [cinemaIdParam]);

  // 数据缓存
  const cinemas = cinemaStore.cinemas;
  const movies = movieStore.movies;
  const allHalls = hallStore.halls;
  const allSchedules = scheduleStore.schedules;
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);
  const cinemaHalls = useMemo(() => allHalls.filter(h => String(h.cinemaId) === String(selectedCinemaId)), [allHalls, selectedCinemaId]);

  // 过滤排期列表
  const filteredScheduleList = useMemo(() => {
    let list = [...allSchedules];
    if (selectedCinemaId) list = list.filter(s => String(s.cinemaId) === String(selectedCinemaId));
    if (keyword) list = list.filter(s => s.movieName.includes(keyword) || s.hallName.includes(keyword));
    if (movieFilter) list = list.filter(s => String(s.movieId) === String(movieFilter));
    if (hallFilter) list = list.filter(s => String(s.hallId) === String(hallFilter));
    if (dateStart && dateEnd) list = list.filter(s => s.showDate >= dateStart && s.showDate <= dateEnd);
    if (statusFilter) list = list.filter(s => s.status === statusFilter);
    // 按放映时间倒序
    return list.sort((a, b) => dayjs(`${b.showDate} ${b.showTime}`).valueOf() - dayjs(`${a.showDate} ${a.showTime}`).valueOf());
  }, [allSchedules, selectedCinemaId, keyword, movieFilter, hallFilter, dateStart, dateEnd, statusFilter]);

  // 计算上座率
  const calcRate = (sold: number, total: number) => total === 0 ? 0 : Math.round((sold / total) * 100);

  // 表格列配置
  const tableColumns: TableProps<ScheduleItem>['columns'] = useMemo(() => [
    {
      title: '影片',
      dataIndex: 'movieName',
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {LANGUAGE_VERSIONS.find(v => v.value === row.languageVersion)?.label}
          </div>
        </div>
      ),
    },
    {
      title: '放映时间',
      dataIndex: 'showDate',
      render: (date, row) => (
        <div style={{ fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} color="#999" />
            {date}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, color: '#666' }}>
            <Clock size={14} />
            {row.showTime} - {row.endTime}
          </div>
        </div>
      ),
    },
    {
      title: '影厅',
      dataIndex: 'hallName',
      render: (hallName, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{hallName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{row.cinemaName}</div>
        </div>
      ),
    },
    {
      title: '票价',
      dataIndex: 'price',
      align: 'center',
      render: (price, row) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 500, color: '#f97316' }}>¥{price}</div>
          {row.vipPrice && row.vipPrice !== price && (
            <div style={{ fontSize: 12, color: '#999', textDecoration: 'line-through' }}>¥{row.vipPrice}</div>
          )}
        </div>
      ),
    },
    {
      title: '座位',
      align: 'center',
      dataIndex: 'soldSeats',
      render: (sold, row) => {
        const rate = calcRate(sold, row.totalSeats);
        let barColor = '#22c55e';
        if (rate >= 80) barColor = '#ef4444';
        else if (rate >= 50) barColor = '#f59e0b';
        return (
          <div style={{ textAlign: 'center' }}>
            <Space size={4} style={{ justifyContent: 'center' }}>
              <Armchair size={14} color="#999" />
              <span>{sold}/{row.totalSeats}</span>
            </Space>
            <div style={{ width: 64, height: 6, background: '#eee', borderRadius: 99, margin: 6, marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ width: `${rate}%`, height: '100%', background: barColor, borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 12, color: barColor }}>{rate}%</span>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      render: (status: ScheduleStatus) => {
        const cfg = SCHEDULE_STATUS_LABELS[status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      width: 160,
      align: 'center',
      render: (_: any, row) => {
        const hasSold = row.soldSeats > 0;
        const isEnd = row.status === SCHEDULE_STATUS.ENDED;
        const isCancel = row.status === SCHEDULE_STATUS.CANCELLED;
        return (
          <Space size={6}>
            {!isEnd && !isCancel && (
              <Button size="small" icon={<Edit2 size={14} />} disabled={hasSold} onClick={() => openEdit(row)}>编辑</Button>
            )}
            {!isEnd && !isCancel && !hasSold && (
              <Button size="small" danger ghost icon={<Ban size={14} />} onClick={() => handleCancelSchedule(row)}>取消</Button>
            )}
            {(isEnd || isCancel) && !hasSold && (
              <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => handleDeleteSchedule(row)}>删除</Button>
            )}
          </Space>
        );
      },
    },
  ], []);

  // 打开新增弹窗
  const openAdd = () => {
    if (!selectedCinemaId) return message.warning('请先选择影院');
    setEditSchedule(null);
    setFormData({
      cinemaId: selectedCinemaId,
      hallId: '',
      movieId: '',
      showDate: dayjs().format('YYYY-MM-DD'),
      showTime: '',
      endTime: '',
      price: 0,
      vipPrice: undefined,
      languageVersion: 'chinese_2d',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (row: ScheduleItem) => {
    setEditSchedule(row);
    setFormData({
      cinemaId: row.cinemaId,
      hallId: row.hallId,
      movieId: row.movieId,
      showDate: row.showDate,
      showTime: row.showTime,
      endTime: row.endTime,
      price: row.price,
      vipPrice: row.vipPrice,
      languageVersion: row.languageVersion,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 返回影院选择页
  const backCinema = () => {
    setSelectedCinemaId('');
    navigate('/schedules');
  };

  // 表单校验
  const validateForm = () => {
    const err: ScheduleFormErr = {};
    if (!formData.cinemaId) err.cinemaId = '请选择影院';
    if (!formData.hallId) err.hallId = '请选择影厅';
    if (!formData.movieId) err.movieId = '请选择影片';
    if (!formData.showDate) err.showDate = '请选择放映日期';
    if (!formData.showTime) err.showTime = '请选择放映时间';
    if (!formData.price || formData.price <= 0) err.price = '票价必须大于0';
    if (!formData.languageVersion) err.languageVersion = '请选择语言版本';
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  // 排期冲突检测
  const checkConflict = (data: ScheduleFormData, excludeId?: string | number) => {
    const targetMovie = movies.find(m => m.id === data.movieId);
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(targetMovie?.duration || 120, 'minute');
    const targetHalls = allSchedules.filter(s => s.hallId === data.hallId && s.id !== excludeId && s.status !== SCHEDULE_STATUS.CANCELLED);
    for (const item of targetHalls) {
      const itemStart = dayjs(`${item.showDate} ${item.showTime}`);
      const itemEnd = itemStart.add(movies.find(m => m.id === item.movieId)?.duration || 120, 'minute');
      if (start.isBefore(itemEnd) && end.isAfter(itemStart)) {
        return { conflict: true, target: item };
      }
    }
    return { conflict: false };
  };

  // 保存排期
  const submitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const { conflict, target } = checkConflict(formData, editSchedule?.id);
      if (conflict) {
        toast.error(`排期冲突：${target.movieName} ${target.showTime}-${target.endTime}`);
        setSubmitting(false);
        return;
      }
      const movie = movies.find(m => m.id === formData.movieId);
      const hall = allHalls.find(h => h.id === formData.hallId);
      const cinema = cinemas.find(c => c.id === formData.cinemaId);
      const payload = {
        ...formData,
        movieName: movie?.name,
        hallName: hall?.name,
        cinemaName: cinema?.name,
        totalSeats: hall?.totalSeats || 0,
        soldSeats: editSchedule?.soldSeats || 0,
        availableSeats: (hall?.totalSeats || 0) - (editSchedule?.soldSeats || 0),
      };
      if (editSchedule) {
        scheduleStore.updateSchedule(editSchedule.id, payload);
        toast.success('排期更新成功');
      } else {
        scheduleStore.addSchedule(payload);
        toast.success('新增排期成功');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 取消场次
  const handleCancelSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return toast.error('该场次存在订单，不可取消');
    Modal.confirm({
      title: '确认取消排期',
      content: `确定取消【${row.movieName} ${row.showDate}】？`,
      okDanger: true,
      onOk: () => {
        scheduleStore.cancelSchedule(row.id);
        toast.success('场次已取消');
      },
    });
  };

  // 删除场次
  const handleDeleteSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return toast.error('该场次存在订单，无法删除');
    Modal.confirm({
      title: '删除确认',
      content: `删除【${row.movieName}】后无法恢复`,
      okDanger: true,
      onOk: () => {
        scheduleStore.deleteSchedule(row.id);
        toast.success('删除成功');
      },
    });
  };

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 0 }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          {selectedCinemaId && (
            <Button type="link" size="small" icon={<ArrowLeft size={16} />} onClick={backCinema} style={{ padding: 0, marginBottom: 8 }}>
              返回影院列表
            </Button>
          )}
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {currentCinema ? `${currentCinema.name} ${currentCinema.branch} - 排期管理` : '场次管理'}
          </h2>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {currentCinema ? '管理本影院放映排片' : '请先选择影院查看排期'}
          </p>
        </div>
        {selectedCinemaId && (
          <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>新增排期</Button>
        )}
      </div>

      {/* 未选影院：影院选择卡片 */}
      {!selectedCinemaId && (
        <div style={{ background: '#fff', padding: 40, borderRadius: 8, textAlign: 'center', border: '1px solid #e8e8e8' }}>
          <div style={{ width: 64, height: 64, background: '#e6f7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MapPin size={32} color="#1677ff" />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>请选择影院</h3>
          <p style={{ color: '#999', marginBottom: 24 }}>选择影院后查看、新增放映排期</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
            {cinemas.map(cinema => (
              <Card hoverable key={cinema.id} onClick={() => { setSelectedCinemaId(cinema.id); navigate(`/schedules?cinemaId=${cinema.id}`); }}>
                <div style={{ fontWeight: 500 }}>{cinema.name} {cinema.branch}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cinema.address}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Armchair size={12} /> {cinema.hallCount} 个影厅
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 已选影院：筛选区+表格 */}
      {selectedCinemaId && (
        <>
          {/* 筛选栏 */}
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <Space wrap size={12} align="center">
              <Input
                placeholder="搜索影片/影厅"
                allowClear
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 300 }}
                prefix={<Search size={14} color="#999" />}
              />
              <Select placeholder="全部影片" allowClear value={movieFilter} onChange={(v) => setMovieFilter(v)} style={{ width: 140 }}>
                {movies.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
              </Select>
              <Select placeholder="全部影厅" allowClear value={hallFilter} onChange={(v) => setHallFilter(v)} style={{ width: 130 }}>
                {cinemaHalls.map(h => <Select.Option key={h.id} value={h.id}>{h.name}</Select.Option>)}
              </Select>
              <Select placeholder="全部状态" allowClear value={statusFilter} onChange={(v) => setStatusFilter(v)} style={{ width: 120 }}>
                {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Space size={8}>
                <DatePicker value={dateStart ? dayjs(dateStart) : undefined} onChange={(d) => setDateStart(d?.format('YYYY-MM-DD'))} placeholder="起始日期" />
                <span style={{ color: '#999' }}>至</span>
                <DatePicker value={dateEnd ? dayjs(dateEnd) : undefined} onChange={(d) => setDateEnd(d?.format('YYYY-MM-DD'))} placeholder="结束日期" />
              </Space>
            </Space>
          </div>

          {/* 排期表格 */}
          <Card styles={{ body: { padding: 0 } }}>
            <Table<ScheduleItem>
              rowKey="id"
              columns={tableColumns}
              dataSource={filteredScheduleList}
              bordered
              scroll={{ x: 'max-content' }}
              rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) }}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        title={editSchedule ? '编辑排期' : '新增排期'}
        width={580}
        maskClosable={false}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <ScheduleForm
          data={formData}
          errors={formErrors}
          onChange={setFormData}
          cinemas={cinemas}
          halls={allHalls}
          movies={movies}
        />
      </Modal>
    </div>
  );
};

export default SchedulePage;