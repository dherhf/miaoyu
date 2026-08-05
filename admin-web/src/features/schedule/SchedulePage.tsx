import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import {
  Table,
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Card,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCinemaStore } from '../cinema';
import { useMovieStore } from '../movie';
import { useHallStore } from '../hall';
import {
  useScheduleStore,
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from './store';
import type { ScheduleItem, ScheduleStatus } from './types';
import { ScheduleForm, LANGUAGE_VERSIONS } from './ScheduleForm';
import type { ScheduleFormData, ScheduleFormErr } from './ScheduleForm';
import styles from './SchedulePage.module.css';

// ===================== 主页面 Schedule排期管理 =====================
export function SchedulePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cinemaStore = useCinemaStore();
  const movieStore = useMovieStore();
  const hallStore = useHallStore();
  const scheduleStore = useScheduleStore();
  const { schedules: allSchedules, loading: scheduleLoading, fetchSchedules } = scheduleStore;
  const { fetchCinemas } = cinemaStore;
  const { fetchMovies } = movieStore;
  const { fetchHalls } = hallStore;

  // URL影院参数
  const cinemaIdParam = searchParams.get('cinemaId');
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam ?? '');

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
    languageVersion: 'chinese_2d',
  });
  const [formErrors, setFormErrors] = useState<ScheduleFormErr>({});

  // 同步URL影院参数
  useEffect(() => {
    if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam);
  }, [cinemaIdParam]);

  // 初始加载：排期 + 影院 + 影片
  useEffect(() => {
    void fetchSchedules();
    void fetchCinemas({ page: 1, size: 100 });
    void fetchMovies({ page: 1, size: 100 });
  }, [fetchSchedules, fetchCinemas, fetchMovies]);

  // 选中影院时加载该影院的影厅
  useEffect(() => {
    if (selectedCinemaId) void fetchHalls({ cinemaId: selectedCinemaId });
  }, [selectedCinemaId, fetchHalls]);

  // 数据缓存
  const cinemas = cinemaStore.cinemas;
  const movies = movieStore.movies;
  const allHalls = hallStore.halls;
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
  const checkConflict = (data: ScheduleFormData, excludeId?: string) => {
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
      if (conflict && target) {
        message.error(`排期冲突：${target.movieName} ${target.showTime}-${target.endTime}`);
        setSubmitting(false);
        return;
      }
      if (editSchedule) {
        await scheduleStore.updateSchedule(editSchedule.id, {
          hallId: formData.hallId,
          showDate: formData.showDate,
          startTime: formData.showTime,
          endTime: formData.endTime,
          price: formData.price,
          languageVersion: formData.languageVersion,
        });
        message.success('排期更新成功');
      } else {
        await scheduleStore.addSchedule({
          movieId: formData.movieId,
          cinemaId: formData.cinemaId,
          hallId: formData.hallId,
          showDate: formData.showDate,
          startTime: formData.showTime,
          price: formData.price,
          languageVersion: formData.languageVersion,
        });
        message.success('新增排期成功');
      }
      setModalOpen(false);
    } catch (e: any) {
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 取消场次
  const handleCancelSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error('该场次存在订单，不可取消');
    Modal.confirm({
      title: '确认取消排期',
      content: `确定取消【${row.movieName} ${row.showDate}】？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.cancelSchedule(row.id);
          message.success('场次已取消');
        } catch (e: any) {
          message.error(e.message || '操作失败');
        }
      },
    });
  };

  // 删除场次
  const handleDeleteSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error('该场次存在订单，无法删除');
    Modal.confirm({
      title: '删除确认',
      content: `删除【${row.movieName}】后无法恢复`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.deleteSchedule(row.id);
          message.success('删除成功');
        } catch (e: any) {
          message.error(e.message || '操作失败');
        }
      },
    });
  };

  // 表格列配置
  const tableColumns: TableProps<ScheduleItem>['columns'] = useMemo(() => [
    {
      title: '影片',
      dataIndex: 'movieName',
      render: (name, row) => (
        <div>
          <div className={styles.cellMovieName}>{name}</div>
          <div className={styles.cellSubText}>
            {LANGUAGE_VERSIONS.find(v => v.value === row.languageVersion)?.label}
          </div>
        </div>
      ),
    },
    {
      title: '放映时间',
      dataIndex: 'showDate',
      render: (date, row) => (
        <div className={styles.cellShowTime}>
          <div className={styles.cellDateRow}>
            <Calendar size={14} color="#999" />
            {date}
          </div>
          <div className={styles.cellTimeRow}>
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
          <div className={styles.cellMovieName}>{hallName}</div>
          <div className={styles.cellSubText}>{row.cinemaName}</div>
        </div>
      ),
    },
    {
      title: '票价',
      dataIndex: 'price',
      align: 'center',
      render: (price) => (
        <div className={styles.cellCenter}>
          <div className={styles.cellPriceValue}>¥{price}</div>
        </div>
      ),
    },
    {
      title: '座位',
      align: 'center',
      dataIndex: 'soldSeats',
      render: (sold, row) => {
        const rate = calcRate(sold, row.totalSeats);
        const barClass = rate >= 80 ? styles.barRed : rate >= 50 ? styles.barAmber : styles.barGreen;
        const textClass = rate >= 80 ? styles.textRed : rate >= 50 ? styles.textAmber : styles.textGreen;
        return (
          <div className={styles.cellCenter}>
            <Space size={4} className={styles.cellCenterSpace}>
              <Armchair size={14} color="#999" />
              <span>{sold}/{row.totalSeats}</span>
            </Space>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${barClass}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={`${styles.rateText} ${textClass}`}>{rate}%</span>
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
      render: (_: unknown, row: ScheduleItem) => {
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

  return (
    <div className={styles.pageRoot}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          {selectedCinemaId && (
            <Button type="link" size="small" icon={<ArrowLeft size={16} />} onClick={backCinema} className={styles.backButton}>
              返回影院列表
            </Button>
          )}
          <h2 className={styles.pageTitle}>
            {currentCinema ? `${currentCinema.name} ${currentCinema.branch} - 排期管理` : '场次管理'}
          </h2>
          <p className={styles.pageSubtitle}>
            {currentCinema ? '管理本影院放映排片' : '请先选择影院查看排期'}
          </p>
        </div>
        {selectedCinemaId && (
          <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>新增排期</Button>
        )}
      </div>

      {/* 未选影院：影院选择卡片 */}
      {!selectedCinemaId && (
        <div className={styles.cinemaSelectPanel}>
          <div className={styles.cinemaIconCircle}>
            <MapPin size={32} color="#1677ff" />
          </div>
          <h3 className={styles.cinemaSelectTitle}>请选择影院</h3>
          <p className={styles.cinemaSelectDesc}>选择影院后查看、新增放映排期</p>
          <div className={styles.cinemaGrid}>
            {cinemas.map(cinema => (
              <Card hoverable key={cinema.id} onClick={() => { setSelectedCinemaId(cinema.id); navigate(`/schedules?cinemaId=${cinema.id}`); }}>
                <div className={styles.cardCinemaName}>{cinema.name} {cinema.branch}</div>
                <div className={styles.cardCinemaAddress}>{cinema.address}</div>
                <div className={styles.cardHallCount}>
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
          <div className={styles.filterBar}>
            <Space wrap size={12} align="center">
              <Input
                placeholder="搜索影片/影厅"
                allowClear
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className={styles.filterInput}
                prefix={<Search size={14} color="#999" />}
              />
              <Select placeholder="全部影片" allowClear value={movieFilter} onChange={(v) => setMovieFilter(v)} className={styles.filterSelectMovie}>
                {movies.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
              </Select>
              <Select placeholder="全部影厅" allowClear value={hallFilter} onChange={(v) => setHallFilter(v)} className={styles.filterSelectHall}>
                {cinemaHalls.map(h => <Select.Option key={h.id} value={h.id}>{h.name}</Select.Option>)}
              </Select>
              <Select placeholder="全部状态" allowClear value={statusFilter} onChange={(v) => setStatusFilter(v)} className={styles.filterSelectStatus}>
                {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.label}</Select.Option>
                ))}
              </Select>
              <Space size={8}>
                <DatePicker value={dateStart ? dayjs(dateStart) : undefined} onChange={(d) => setDateStart(d?.format('YYYY-MM-DD'))} placeholder="起始日期" />
                <span className={styles.dateSeparator}>至</span>
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
              loading={scheduleLoading}
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
}
