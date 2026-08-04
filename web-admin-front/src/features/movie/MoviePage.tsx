import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Power,
  PowerOff,
  Film,
  AlertTriangle,
} from 'lucide-react';
import { Modal, Button, Space, Tag, message, Form } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { useMovieStore, MOVIE_TYPES } from './store';
import { useScheduleStore } from '../schedule';
import { movieApi } from './api';
import request from '../../shared/utils/request';
import type { MovieStatus, MovieItem, MovieCreateParams, MovieFormValues } from './types';
import { mapMovieStatus, toApiStatus } from './types';
import { MovieForm } from './MovieForm';
import styles from './MoviePage.module.css';

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

//主页面 Movie 影片管理
export function MovieManage() {
  const actionRef = useRef<ActionType>(null);
  const { fetchMovies, addMovie, editMovie, toggleStatus } = useMovieStore();
  const { hasMovieSchedule } = useScheduleStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasScheduleTip, setHasScheduleTip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [form] = Form.useForm<MovieFormValues>();

  // 打开新增弹窗
  const openAdd = () => {
    setEditingMovie(null);
    setHasScheduleTip(false);
    form.resetFields();
    form.setFieldsValue(EMPTY_FORM);
    setPendingFile(null);
    setModalOpen(true);
  };

  // 打开编辑弹窗（拉取详情补全 director/actors/description）
  const openEdit = async (row: MovieItem) => {
    setEditingMovie(row);
    const existSchedule = hasMovieSchedule(row.id);
    setHasScheduleTip(existSchedule);
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

  // 单条上下架
  const handleToggle = async (row: MovieItem, targetStatus: MovieStatus) => {
    const action = targetStatus === 'showing' ? '上架' : '下架';
    if (targetStatus === 'offline' && hasMovieSchedule(row.id)) {
      Modal.confirm({
        title: '确认下架',
        content: '该影片存在关联场次，下架后相关场次将不再展示，是否继续？',
        okText: '确认下架',
        okButtonProps: { danger: true },
        onOk: async () => {
          await toggleStatus([row.id], targetStatus);
          toast.success(`已${action}`);
          actionRef.current?.reload();
        },
      });
      return;
    }
    await toggleStatus([row.id], targetStatus);
    toast.success(`已${action}`);
    actionRef.current?.reload();
  };

  // 批量操作
  const batchOperate = async (targetStatus: MovieStatus) => {
    if (selectedIds.length === 0) return message.warning('请先勾选影片');
    const action = targetStatus === 'showing' ? '上架' : '下架';
    const hasRelated = selectedIds.some((id) => hasMovieSchedule(id));
    if (targetStatus === 'offline' && hasRelated) {
      Modal.confirm({
        title: '批量下架',
        content: '选中部分影片存在关联场次，下架后场次隐藏，确认执行？',
        okText: '确认',
        okButtonProps: { danger: true },
        onOk: async () => {
          await toggleStatus(selectedIds, targetStatus);
          toast.success(`成功${action}${selectedIds.length}部影片`);
          setSelectedIds([]);
          actionRef.current?.reload();
        },
      });
      return;
    }
    await toggleStatus(selectedIds, targetStatus);
    toast.success(`成功${action}${selectedIds.length}部影片`);
    setSelectedIds([]);
    actionRef.current?.reload();
  };

  // 保存提交
  const onSubmitForm = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 如果有新选的文件，提交时才上传到 OSS
      let posterUrl = values.posterUrl;
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        const res = await request.post<{ objectKey: string }>('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        posterUrl = res.objectKey;
      }

      const payload: MovieCreateParams = {
        name: values.name,
        types: values.types,
        posterUrl,
        rating: values.rating ?? 0,
        duration: values.duration,
        releaseDate: dayjs.isDayjs(values.releaseDate)
          ? values.releaseDate.format('YYYY-MM-DD')
          : values.releaseDate,
        director: values.director || undefined,
        actors: values.actors || undefined,
        description: values.description || undefined,
      };
      if (editingMovie) {
        await editMovie(editingMovie.id, payload);
        if (editingMovie.status !== values.status) {
          await toggleStatus([editingMovie.id], values.status);
        }
        toast.success('影片更新成功');
      } else {
        const detail = await addMovie(payload);
        if (values.status === 'showing') {
          await toggleStatus([detail.id], 'showing');
        }
        toast.success('新增影片成功');
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

  const columns: ProColumns<MovieItem>[] = [
    {
      title: '影片名称',
      dataIndex: 'name',
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
              {record.types.map((t) => MOVIE_TYPES.find((mt) => mt.value === t)?.label).join('、')}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      align: 'center',
      sorter: true,
      search: false,
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
      sorter: true,
      search: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
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
      render: (_, record) => (
        <Space size={8}>
          <Button size="small" icon={<Edit2 size={14} />} onClick={() => openEdit(record)}>
            编辑
          </Button>
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
      <ProTable<MovieItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params, sort) => {
          let sortParam: string | undefined;
          if (sort?.rating === 'descend') {
            sortParam = 'rating_desc';
          }
          const statusValue = params.status as MovieStatus | undefined;
          await fetchMovies({
            keyword: params.name || undefined,
            type: params.type || undefined,
            status: statusValue ? toApiStatus(statusValue) : undefined,
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
            sort: sortParam,
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
          pageSize: 10,
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
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
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

      <Modal
        title={editingMovie ? '编辑影片' : '新增影片'}
        open={modalOpen}
        width={620}
        maskClosable={false}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmitForm}
      >
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
