import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Armchair,
  ArrowLeft,
  Ban,
  RotateCcw,
} from 'lucide-react';
import {
  Modal,
  Button,
  Space,
  Tag,
  Card,
  App,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
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
import type { ScheduleItem } from './types';
import { ScheduleForm } from './ScheduleForm';
import type { ScheduleFormData, ScheduleFormErr } from './ScheduleForm';
import styles from './SchedulePage.module.css';

// ===================== 主页面 排期管理 =====================

/**
 * 排期管理页面组件
 *
 * 功能：
 * 1. 未选影院时：展示影院卡片列表，点击选择影院
 * 2. 选中影院后：展示该影院的排期列表（ProTable）
 * 3. 新增排期：选择影厅、影片、日期时间、票价、语言版本
 * 4. 编辑排期：修改场次信息
 * 5. 排期冲突检测：同一影厅时间重叠不允许创建
 * 6. 取消/恢复/删除场次（有订单的场次不可取消/删除）
 * 7. 上座率进度条展示
 * 8. URL 参数 cinemaId 支持直接进入某影院的排期管理
 */
export function SchedulePage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [searchParams] = useSearchParams();
  // 各模块 store
  const cinemaStore = useCinemaStore();
  const movieStore = useMovieStore();
  const hallStore = useHallStore();
  const { message, modal } = App.useApp();
  const scheduleStore = useScheduleStore();
  const { fetchSchedules } = scheduleStore;
  const { fetchCinemas } = cinemaStore;
  const { fetchMovies } = movieStore;
  const { fetchHalls } = hallStore;

  // URL 影院参数
  const cinemaIdParam = searchParams.get('cinemaId');
  // 当前选中的影院 ID
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam ?? '');

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 当前编辑的排期（null 表示新增模式）
  const [editSchedule, setEditSchedule] = useState<ScheduleItem | null>(null);
  // 表单数据
  const [formData, setFormData] = useState<ScheduleFormData>({
    cinemaId: '',
    hallId: '',
    movieId: '',
    showDate: '',
    showTime: '',
    endTime: '',
    price: 0,
    languageVersion: '国语 2D',
  });
  // 表单校验错误
  const [formErrors, setFormErrors] = useState<ScheduleFormErr>({});

  // 同步 URL 影院参数
  useEffect(() => {
    if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam);
  }, [cinemaIdParam]);

  // 初始加载：排期 + 影院 + 影片（一次性加载全部数据供下拉选择）
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
  // 当前选中的影院对象
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);

  /**
   * 计算上座率
   * @param sold - 已售座位数
   * @param total - 总座位数
   * @returns 上座率百分比（0-100，整数）
   */
  const calcRate = (sold: number, total: number) => total === 0 ? 0 : Math.round((sold / total) * 100);

  /**
   * 打开新增排期弹窗
   * 必须先选择影院
   */
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
      languageVersion: '国语 2D',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  /**
   * 打开编辑排期弹窗
   * 将选中排期的数据回填到表单
   */
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

  /** 返回影院选择页 */
  const backCinema = () => {
    setSelectedCinemaId('');
    navigate('/schedules');
  };

  /**
   * 表单校验
   * 校验必填字段，返回是否通过
   */
  const validateForm = () => {
    const err: ScheduleFormErr = {};
    if (!formData.hallId) err.hallId = '请选择影厅';
    if (!formData.movieId) err.movieId = '请选择影片';
    if (!formData.showDate) err.showDate = '请选择放映日期';
    if (!formData.showTime) err.showTime = '请选择放映时间';
    if (!formData.price || formData.price <= 0) err.price = '票价必须大于0';
    if (!formData.languageVersion) err.languageVersion = '请选择语言版本';
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  /**
   * 排期冲突检测
   * 检查同一影厅在指定时间段内是否已有其他场次
   * @param data - 表单数据
   * @param excludeId - 排除的场次 ID（编辑时排除自身）
   * @returns { conflict: boolean, target?: ScheduleItem }
   */
  const checkConflict = (data: ScheduleFormData, excludeId?: string) => {
    // 获取影片时长（用于计算结束时间）
    const targetMovie = movies.find(m => m.id === data.movieId);
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(targetMovie?.duration || 120, 'minute');
    // 获取同影厅、非取消、非自身的场次
    const targetHalls = scheduleStore.schedules.filter(s => s.hallId === data.hallId && s.id !== excludeId && s.status !== SCHEDULE_STATUS.CANCELLED);
    // 逐个检查时间是否重叠
    for (const item of targetHalls) {
      const itemStart = dayjs(`${item.showDate} ${item.showTime}`);
      const itemEnd = itemStart.add(movies.find(m => m.id === item.movieId)?.duration || 120, 'minute');
      // 时间重叠判断：start < itemEnd && end > itemStart
      if (start.isBefore(itemEnd) && end.isAfter(itemStart)) {
        return { conflict: true, target: item };
      }
    }
    return { conflict: false };
  };

  /**
   * 保存排期（新增或编辑）
   * 1. 表单校验
   * 2. 排期冲突检测
   * 3. 调用 store 的 addSchedule 或 updateSchedule
   * 4. 成功后关闭弹窗并刷新列表
   */
  const submitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      // 排期冲突检测
      const { conflict, target } = checkConflict(formData, editSchedule?.id);
      if (conflict && target) {
        message.error(`排期冲突：${target.movieName} ${target.showTime}-${target.endTime}`);
        setSubmitting(false);
        return;
      }
      if (editSchedule) {
        // 编辑模式：更新排期
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
        // 新增模式：创建排期
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
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 取消场次
   * 有已售座位的场次不可取消
   */
  const handleCancelSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error('该场次存在订单，不可取消');
    modal.confirm({
      title: '确认取消排期',
      content: `确定取消【${row.movieName} ${row.showDate}】？`,
      okText: '确认取消',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.cancelSchedule(row.id);
          message.success('场次已取消');
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '操作失败');
        }
      },
    });
  };

  /**
   * 恢复已取消的场次
   */
  const handleRestoreSchedule = (row: ScheduleItem) => {
    modal.confirm({
      title: '确认恢复排期',
      content: `确定恢复【${row.movieName} ${row.showDate}】为在售状态？`,
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          await scheduleStore.restoreSchedule(row.id);
          message.success('场次已恢复');
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '操作失败');
        }
      },
    });
  };

  /**
   * 删除场次
   * 有已售座位的场次不可删除
   */
  const handleDeleteSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error('该场次存在订单，无法删除');
    modal.confirm({
      title: '删除确认',
      content: `删除【${row.movieName}】后无法恢复`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.deleteSchedule(row.id);
          message.success('删除成功');
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || '操作失败');
        }
      },
    });
  };

  // 表格列配置
  const columns: ProColumns<ScheduleItem>[] = [
    {
      title: '影片',
      dataIndex: 'movieId',
      valueType: 'select',
      fieldProps: { showSearch: true, allowClear: true, placeholder: '请选择影片' },
      // 影片名映射
      valueEnum: Object.fromEntries(movies.map(m => [String(m.id), { text: m.name }])),
      // 影片名 + 语言版本
      render: (_, record) => (
        <div>
          <div className={styles.cellMovieName}>{record.movieName}</div>
          <div className={styles.cellSubText}>
            {record.languageVersion}
          </div>
        </div>
      ),
    },
    {
      title: '放映时间',
      dataIndex: 'showDate',
      search: false,
      // 日期 + 时间段
      render: (_, record) => (
        <div className={styles.cellShowTime}>
          <div className={styles.cellDateRow}>
            <Calendar size={14} color="#999" />
            {record.showDate}
          </div>
          <div className={styles.cellTimeRow}>
            <Clock size={14} />
            {record.showTime} - {record.endTime}
          </div>
        </div>
      ),
    },
    {
      title: '影厅',
      dataIndex: 'hallId',
      valueType: 'select',
      fieldProps: { showSearch: true, allowClear: true, placeholder: '请选择影厅' },
      // 影厅名映射
      valueEnum: Object.fromEntries(allHalls.map(h => [String(h.id), { text: h.name }])),
      // 影厅名 + 影院名
      render: (_, record) => (
        <div>
          <div className={styles.cellMovieName}>{record.hallName}</div>
          <div className={styles.cellSubText}>{record.cinemaName}</div>
        </div>
      ),
    },
    {
      title: '票价',
      dataIndex: 'price',
      align: 'center',
      search: false,
      render: (_, record) => (
        <div className={styles.cellCenter}>
          <div className={styles.cellPriceValue}>¥{record.price}</div>
        </div>
      ),
    },
    {
      title: '座位',
      align: 'center',
      dataIndex: 'soldSeats',
      search: false,
      // 上座率进度条展示
      render: (_, record) => {
        const rate = calcRate(record.soldSeats, record.totalSeats);
        // 进度条颜色：≥80红 / ≥50橙 / 其他绿
        const barClass = rate >= 80 ? styles.barRed : rate >= 50 ? styles.barAmber : styles.barGreen;
        const textClass = rate >= 80 ? styles.textRed : rate >= 50 ? styles.textAmber : styles.textGreen;
        return (
          <div className={styles.cellCenter}>
            <Space size={4} className={styles.cellCenterSpace}>
              <Armchair size={14} color="#999" />
              <span>{record.soldSeats}/{record.totalSeats}</span>
            </Space>
            {/* 进度条 */}
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
      valueType: 'select',
      valueEnum: {
        available: { text: '可售' },
        full: { text: '满场' },
        ended: { text: '已结束' },
        cancelled: { text: '已取消' },
      },
      // 状态标签
      render: (_, record) => {
        const cfg = SCHEDULE_STATUS_LABELS[record.status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      width: 160,
      align: 'center',
      search: false,
      // 根据状态和是否有订单显示不同操作按钮
      render: (_, record) => {
        const hasSold = record.soldSeats > 0;
        const isEnd = record.status === SCHEDULE_STATUS.ENDED;
        const isCancel = record.status === SCHEDULE_STATUS.CANCELLED;
        return (
          <Space size={6}>
            {/* 可售/满场：编辑 + 取消（有订单时禁用） */}
            {!isEnd && !isCancel && (
              <Button size="small" icon={<Edit2 size={14} />} disabled={hasSold} onClick={() => openEdit(record)}>编辑</Button>
            )}
            {!isEnd && !isCancel && (
              <Button size="small" danger ghost icon={<Ban size={14} />} disabled={hasSold} onClick={() => handleCancelSchedule(record)}>取消</Button>
            )}
            {/* 已取消：恢复 */}
            {isCancel && (
              <Button size="small" type="primary" ghost icon={<RotateCcw size={14} />} onClick={() => handleRestoreSchedule(record)}>恢复</Button>
            )}
            {/* 已结束/已取消：删除（有订单时禁用） */}
            {(isEnd || isCancel) && (
              <Button size="small" danger icon={<Trash2 size={14} />} disabled={hasSold} onClick={() => handleDeleteSchedule(record)}>删除</Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.pageRoot}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          {/* 选中影院时显示返回按钮 */}
          {selectedCinemaId && (
            <Button type="link" size="small" icon={<ArrowLeft size={16} />} onClick={backCinema} className={styles.backButton}>
              返回影院列表
            </Button>
          )}
          <h2 className={styles.pageTitle}>
            {currentCinema ? `${currentCinema.name} - 排期管理` : '场次管理'}
          </h2>
          <p className={styles.pageSubtitle}>
            {currentCinema ? '管理本影院放映排片' : '请先选择影院查看排期'}
          </p>
        </div>
        {/* 选中影院时显示新增按钮 */}
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
          {/* 影院卡片网格 */}
          <div className={styles.cinemaGrid}>
            {cinemas.map(cinema => (
              <Card hoverable key={cinema.id} onClick={() => { setSelectedCinemaId(cinema.id); navigate(`/schedules?cinemaId=${cinema.id}`); }}>
                <div className={styles.cardCinemaName}>{cinema.name}</div>
                <div className={styles.cardCinemaAddress}>{cinema.address}</div>
                <div className={styles.cardHallCount}>
                  <Armchair size={12} /> {cinema.hallCount} 个影厅
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 已选影院：排期列表 ProTable */}
      {selectedCinemaId && (
        <ProTable<ScheduleItem>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            // 查询指定影院的排期列表
            await fetchSchedules({
              cinemaId: selectedCinemaId,
              movieId: params.movieId || undefined,
              hallId: params.hallId || undefined,
              status: params.status === 'available' ? 'onsale' : params.status,
              page: params.current ?? 1,
              size: params.pageSize ?? 10,
            });
            const state = useScheduleStore.getState();
            return {
              data: state.schedules,
              success: true,
              total: state.total,
            };
          }}
          search={{ labelWidth: 'auto', span: 6, defaultCollapsed: false }}
          pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50], showSizeChanger: true }}
          bordered
          scroll={{ x: 'max-content' }}
          headerTitle={`${currentCinema?.name ?? ''} 排期列表`}
        />
      )}

      {/* 新增/编辑排期弹窗 */}
      <Modal
        open={modalOpen}
        title={editSchedule ? '编辑排期' : '新增排期'}
        width={580}
        maskClosable={false}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <ScheduleForm
          data={formData}
          errors={formErrors}
          onChange={setFormData}
          halls={allHalls}
          movies={movies}
        />
      </Modal>
    </div>
  );
}
