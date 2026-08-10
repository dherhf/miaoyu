import { useState, useRef } from 'react';
import {
  Plus,
  Edit2,
  Power,
  PowerOff,
  Film,
  AlertTriangle,
} from 'lucide-react';
import { Modal, Button, Space, Tag, App, Form } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { useMovieStore, MOVIE_TYPES } from './store';
import { useScheduleStore } from '../schedule';
import { movieApi } from './api';
import type { MovieStatus, MovieItem, MovieCreateParams, MovieFormValues } from './types';
import { mapMovieStatus, toApiStatus } from './types';
import { MovieForm } from './MovieForm';
import styles from './MoviePage.module.css';

/** 空表单初始值 */
const EMPTY_FORM: MovieFormValues = {
  name: '',
  types: [],
  posterUrl: '',
  rating: null,
  duration: 0,
  releaseDate: '',
  director: '',
  actors: '',
  description: '',
  status: 'showing',
};

/**
 * 影片管理页面组件
 *
 * 功能：
 * 1. 影片列表展示（ProTable，支持按名称、类型、状态搜索）
 * 2. 新增影片（弹窗表单，含海报上传）
 * 3. 编辑影片（先回填列表数据，再拉取详情补全）
 * 4. 单条上架/下架（有关联场次时弹窗确认）
 * 5. 批量上架/下架
 * 6. 海报上传策略：选择时暂存，提交时上传到 OSS
 * 7. 关联场次提示：编辑有关联场次的影片时显示警告
 */
export function MovieManage() {
  const actionRef = useRef<ActionType>(null);
  const { message, modal } = App.useApp();
  // 影片 store
  const { fetchMovies, addMovie, editMovie, toggleStatus } = useMovieStore();
  // 排期 store（用于检查影片是否有关联场次）
  const { hasMovieSchedule } = useScheduleStore();

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  // 当前编辑的影片（null 表示新增模式）
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 是否有关联场次（编辑模式下显示提示）
  const [hasScheduleTip, setHasScheduleTip] = useState(false);
  // 批量选中 ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 暂存的海报文件（提交时上传到 OSS）
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [form] = Form.useForm<MovieFormValues>();

  /**
   * 打开新增弹窗
   * 重置表单为空值
   */
  const openAdd = () => {
    setEditingMovie(null);
    setHasScheduleTip(false);
    form.resetFields();
    form.setFieldsValue(EMPTY_FORM);
    setPendingFile(null);
    setModalOpen(true);
  };

  /**
   * 打开编辑弹窗
   * 1. 先用列表数据回填表单（快速展示）
   * 2. 异步拉取详情补全 director/actors/description
   */
  const openEdit = async (row: MovieItem) => {
    setEditingMovie(row);
    // 检查影片是否有关联场次
    const existSchedule = hasMovieSchedule(row.id);
    setHasScheduleTip(existSchedule);
    // 先用列表数据回填
    form.setFieldsValue({
      name: row.name,
      types: row.types,
      posterUrl: row.posterUrl,
      rating: row.rating,
      duration: row.duration,
      releaseDate: row.releaseDate ? dayjs(row.releaseDate) : undefined,
      director: row.director,
      actors: row.actors,
      description: row.description,
      status: row.status,
    } as unknown as Partial<MovieFormValues>);
    setModalOpen(true);
    // 异步拉取详情补全完整字段
    try {
      const detail = await movieApi.getMovieDetail(row.id);
      form.setFieldsValue({
        name: detail.name,
        types: detail.types ?? [],
        posterUrl: detail.posterUrl ?? '',
        rating: detail.rating ?? null,
        duration: detail.duration ?? 0,
        releaseDate: detail.releaseDate ? dayjs(detail.releaseDate) : undefined,
        director: detail.director ?? '',
        actors: detail.actors ?? '',
        description: detail.description ?? '',
        status: mapMovieStatus(detail.status),
      } as unknown as Partial<MovieFormValues>);
    } catch {
      // 错误已由响应拦截器提示
    }
  };

  /**
   * 单条上下架
   * - 下架有关联场次时弹窗确认
   * - 上架直接执行
   */
  const handleToggle = async (row: MovieItem, targetStatus: MovieStatus) => {
    const action = targetStatus === 'showing' ? '上架' : '下架';
    // 下架时检查关联场次
    if (targetStatus === 'offline' && hasMovieSchedule(row.id)) {
      modal.confirm({
        title: '确认下架',
        content: '该影片存在关联场次，下架后相关场次将不再展示，是否继续？',
        okText: '确认下架',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          await toggleStatus([row.id], targetStatus);
          message.success(`已${action}`);
          actionRef.current?.reload();
        },
      });
      return;
    }
    await toggleStatus([row.id], targetStatus);
    message.success(`已${action}`);
    actionRef.current?.reload();
  };

  /**
   * 批量上下架
   * - 批量下架时检查关联场次
   * - 无选中时提示
   */
  const batchOperate = async (targetStatus: MovieStatus) => {
    if (selectedIds.length === 0) return message.warning('请先勾选影片');
    const action = targetStatus === 'showing' ? '上架' : '下架';
    // 批量下架时检查关联场次
    const hasRelated = selectedIds.some((id) => hasMovieSchedule(id));
    if (targetStatus === 'offline' && hasRelated) {
      modal.confirm({
        title: '批量下架',
        content: '选中部分影片存在关联场次，下架后场次隐藏，确认执行？',
        okText: '确认',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          await toggleStatus(selectedIds, targetStatus);
          message.success(`成功${action}${selectedIds.length}部影片`);
          setSelectedIds([]);
          actionRef.current?.reload();
        },
      });
      return;
    }
    await toggleStatus(selectedIds, targetStatus);
    message.success(`成功${action}${selectedIds.length}部影片`);
    setSelectedIds([]);
    actionRef.current?.reload();
  };

  /**
   * 表单提交处理（新增或编辑）
   * 1. 如果有暂存的海报文件，提交时上传到 OSS
   * 2. 构建提交参数（处理空值和日期格式化）
   * 3. 编辑模式：更新影片 + 如果状态变更则上下架
   * 4. 新增模式：创建影片 + 如果选择上架则自动上架
   */
  const onSubmitForm = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 如果有新选的文件，提交时才上传到 OSS
      let posterUrl = values.posterUrl;
      if (pendingFile) {
        const res = await movieApi.uploadImage(pendingFile);
        posterUrl = res.objectKey;
      }

      // 构建提交参数
      const payload: MovieCreateParams = {
        name: values.name,
        types: values.types,
        posterUrl,
        rating: values.rating ?? 0,
        duration: values.duration,
        // 日期格式化：dayjs → 字符串
        releaseDate: dayjs.isDayjs(values.releaseDate)
          ? values.releaseDate.format('YYYY-MM-DD')
          : values.releaseDate,
        director: values.director || undefined,
        actors: values.actors || undefined,
        description: values.description || undefined,
      };
      if (editingMovie) {
        // 编辑模式：更新影片信息
        await editMovie(editingMovie.id, payload);
        // 如果状态有变更，执行上下架
        if (editingMovie.status !== values.status) {
          await toggleStatus([editingMovie.id], values.status);
        }
        message.success('影片更新成功');
      } else {
        // 新增模式：创建影片
        const detail = await addMovie(payload);
        // 如果新增时选择上架，自动执行上架操作
        if (values.status === 'showing') {
          await toggleStatus([detail.id], 'showing');
        }
        message.success('新增影片成功');
      }
      setModalOpen(false);
      setPendingFile(null);
      actionRef.current?.reload();
    } catch {
      // validateFields 失败时 antd 自动展示校验信息
    } finally {
      setSubmitting(false);
    }
  };

  // ProTable 列配置
  const columns: ProColumns<MovieItem>[] = [
    {
      title: '影片名称',
      dataIndex: 'name',
      // 自定义渲染：海报缩略图 + 名称 + 类型
      render: (_, record) => (
        <Space size={12}>
          <div className={styles.posterThumb}>
            {record.posterUrl ? (
              <img src={record.posterUrl} alt={record.name} className={styles.posterImage} />
            ) : (
              <div className={styles.posterPlaceholder}>
                <Film size={18} color='#aaa' />
              </div>
            )}
          </div>
          <div>
            <div className={styles.movieName}>{record.name}</div>
            <div className={styles.movieTypes}>
              {record.types.join('、')}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      align: 'center',
      // 支持点击表头排序
      sorter: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
      search: false,
      // 评分颜色：≥8高 / ≥6中 / 其他低
      render: (_, record) => {
        const val = record.rating ?? 0;
        return (
          <span
            className={`${styles.ratingValue} ${
              val >= 8 ? styles.ratingHigh : val >= 6 ? styles.ratingMid : styles.ratingLow
            }`}
          >
            {val || '-'}
          </span>
        );
      },
    },
    {
      title: '时长',
      dataIndex: 'duration',
      align: 'center',
      search: false,
      render: (_, record) => `${record.duration}分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        showing: { text: '上架' },
        offline: { text: '下架' },
      },
      // 状态标签：上架=绿色 / 下架=灰色
      render: (_, record) => (
        <Tag color={record.status === 'showing' ? 'green' : 'default'}>
          {record.status === 'showing' ? '上架' : '下架'}
        </Tag>
      ),
    },
    {
      title: '上映日期',
      dataIndex: 'releaseDate',
      align: 'center',
      // 支持点击表头排序
      sorter: (a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''),
      search: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
      // 在表格中隐藏，仅用于搜索筛选
      hideInTable: true,
      valueType: 'select',
      valueEnum: Object.fromEntries(MOVIE_TYPES.map((t) => [t.value, { text: t.label }])),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      search: false,
      // 操作按钮：编辑 + 上架/下架
      render: (_, record) => (
        <Space size={8}>
          <Button size="small" icon={<Edit2 size={14} />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          {/* 根据当前状态显示上架或下架按钮 */}
          {record.status === 'offline' ? (
            <Button
              size="small"
              type="link"
              icon={<Power size={14} />}
              onClick={() => handleToggle(record, 'showing')}
            >
              上架
            </Button>
          ) : (
            <Button
              size="small"
              danger
              type="link"
              icon={<PowerOff size={14} />}
              onClick={() => handleToggle(record, 'offline')}
            >
              下架
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* 影片列表 ProTable */}
      <ProTable<MovieItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          // 查询影片列表
          const statusValue = params.status as MovieStatus | undefined;
          await fetchMovies({
            keyword: params.name || undefined,
            type: params.type || undefined,
            status: statusValue ? toApiStatus(statusValue) : undefined,
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
          });
          const state = useMovieStore.getState();
          return {
            data: state.movies,
            success: true,
            total: state.total,
          };
        }}
        search={{ labelWidth: 'auto', span: 6, defaultCollapsed: false }}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        bordered
        scroll={{ x: 'max-content' }}
        headerTitle="影片管理"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<Plus size={16} />} onClick={openAdd}>
            新增影片
          </Button>,
        ]}
        // 行选择配置
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
        // 选中行时的批量操作栏
        tableAlertOptionRender={() => (
          <Space size={12}>
            <span>已选{selectedIds.length}部</span>
            <Button size="small" onClick={() => batchOperate('showing')}>
              批量上架
            </Button>
            <Button size="small" danger onClick={() => batchOperate('offline')}>
              批量下架
            </Button>
          </Space>
        )}
      />

      {/* 新增/编辑影片弹窗 */}
      <Modal
        title={editingMovie ? '编辑影片' : '新增影片'}
        open={modalOpen}
        width={620}
        maskClosable={false}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={onSubmitForm}
      >
        {/* 关联场次警告提示 */}
        {hasScheduleTip && (
          <div className={styles.scheduleTip}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div>
              <div className={styles.scheduleTipTitle}>该影片存在关联场次</div>
              <div className={styles.scheduleTipDesc}>修改信息会影响排期展示，请谨慎编辑</div>
            </div>
          </div>
        )}
        <MovieForm form={form} onFileSelect={setPendingFile} />
      </Modal>
    </div>
  );
}
