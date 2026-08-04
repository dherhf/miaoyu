import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit2,
  Power,
  PowerOff,
  Film,
  AlertTriangle,
} from 'lucide-react';
import {
  Table,
  Modal,
  Input,
  Button,
  Space,
  Tag,
  Select,
  Card,
  message,
  Form,
} from 'antd';
import type { TableProps } from 'antd';
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
  const { movies, loading, total, fetchMovies, addMovie, editMovie, toggleStatus } = useMovieStore();
  const { hasMovieSchedule } = useScheduleStore();

  // 筛选 / 分页 / 排序状态
  const [searchInput, setSearchInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<MovieStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortParam, setSortParam] = useState<string | undefined>(undefined);

  // 弹窗状态
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasScheduleTip, setHasScheduleTip] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // antd Form 实例
  const [form] = Form.useForm<MovieFormValues>();
  const posterUrl = Form.useWatch('posterUrl', form);

  // 服务端查询
  useEffect(() => {
    void fetchMovies({
      keyword: appliedKeyword || undefined,
      type: typeFilter,
      status: statusFilter !== undefined ? toApiStatus(statusFilter) : undefined,
      page,
      size: pageSize,
      sort: sortParam,
    });
  }, [fetchMovies, appliedKeyword, typeFilter, statusFilter, page, pageSize, sortParam]);

  // 表格列配置
  const tableColumns: TableProps<MovieItem>['columns'] = useMemo(() => [
    {
      title: '影片名称',
      dataIndex: 'name',
      render: (name, row) => (
        <Space size={12}>
          <div className={styles.posterThumb}>
            {row.posterUrl ? (
              <img src={row.posterUrl} alt={name} className={styles.posterImage} />
            ) : (
              <div className={styles.posterPlaceholder}>
                <Film size={18} color='#aaa' />
              </div>
            )}
          </div>
          <div>
            <div className={styles.movieName}>{name}</div>
            <div className={styles.movieTypes}>
              {row.types.map((t) => MOVIE_TYPES.find(mt => mt.value === t)?.label).join('、')}
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
      sortOrder: sortParam === 'rating_desc' ? 'descend' : undefined,
      render: (val) => (
        <span className={`${styles.ratingValue} ${val >= 8 ? styles.ratingHigh : val >= 6 ? styles.ratingMid : styles.ratingLow}`}>
          {val}
        </span>
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      align: 'center',
      render: (v) => `${v}分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      render: (status: MovieStatus) => (
        <Tag color={status === 'showing' ? 'green' : 'default'}>
          {status === 'showing' ? '上架' : '下架'}
        </Tag>
      ),
    },
    {
      title: '上映日期',
      dataIndex: 'releaseDate',
      align: 'center',
      sorter: true,
      sortOrder: (sortParam === undefined || sortParam === 'releaseDateDesc') ? 'descend' : undefined,
    },
    {
      title: '操作',
      width: 160,
      align: 'center',
      render: (_v, row) => (
        <Space size={8}>
          <Button size="small" icon={<Edit2 size={14} />} onClick={() => openEdit(row)}>编辑</Button>
          {row.status === 'offline' ? (
            <Button size="small" type="link" icon={<Power size={14} />} onClick={() => handleToggle(row, 'showing')}>上架</Button>
          ) : (
            <Button size="small" danger type="link" icon={<PowerOff size={14} />} onClick={() => handleToggle(row, 'offline')}>下架</Button>
          )}
        </Space>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [sortParam]);

  // 表格分页 + 排序
  const onTableChange: TableProps<MovieItem>['onChange'] = (pagination, _filters, sorter) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    setSelectedIds([]);

    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s.order === 'descend' && s.field === 'rating') {
      setSortParam('rating_desc');
    } else {
      setSortParam(undefined);
    }
  };

  // 搜索
  const onSearch = () => {
    setAppliedKeyword(searchInput);
    setPage(1);
    setSelectedIds([]);
  };

  // 筛选重置
  const onResetFilter = () => {
    setSearchInput('');
    setAppliedKeyword('');
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setSortParam(undefined);
    setPage(1);
    setSelectedIds([]);
  };

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
    // 先用列表数据填充
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
    // 拉取详情补全
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
        },
      });
      return;
    }
    await toggleStatus([row.id], targetStatus);
    toast.success(`已${action}`);
  };

  // 批量操作
  const batchOperate = async (targetStatus: MovieStatus) => {
    if (selectedIds.length === 0) return message.warning('请先勾选影片');
    const action = targetStatus === 'showing' ? '上架' : '下架';
    const hasRelated = selectedIds.some(id => hasMovieSchedule(id));
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
        },
      });
      return;
    }
    await toggleStatus(selectedIds, targetStatus);
    toast.success(`成功${action}${selectedIds.length}部影片`);
    setSelectedIds([]);
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
    } catch {
      // validateFields 失败时 antd 自动展示校验信息
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>影片管理</h2>
          <p className={styles.pageSubtitle}>管理上架/下架影片基础资料</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>新增影片</Button>
      </div>

      {/* 搜索筛选栏 */}
      <div className={styles.filterArea}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="搜索影片名称"
            allowClear
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value) {
                setAppliedKeyword('');
                setPage(1);
              }
            }}
            onPressEnter={onSearch}
            className={styles.searchInput}
            prefix={<Search size={14} color="#999" />}
          />
          <Select
            placeholder="全部类型"
            allowClear
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            className={styles.typeSelect}
          >
            {MOVIE_TYPES.map(item => (
              <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="全部状态"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            className={styles.statusSelect}
          >
            <Select.Option value="showing">上架</Select.Option>
            <Select.Option value="offline">下架</Select.Option>
          </Select>
          <Button type="primary" onClick={onSearch}>搜索</Button>
          {(appliedKeyword || typeFilter || statusFilter) && (
            <Button onClick={onResetFilter}>重置</Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <span className={styles.selectedCount}>已选{selectedIds.length}部</span>
              <Button onClick={() => batchOperate('showing')}>批量上架</Button>
              <Button danger onClick={() => batchOperate('offline')}>批量下架</Button>
            </>
          )}
        </Space>
      </div>

      {/* 表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<MovieItem>
          rowKey="id"
          columns={tableColumns}
          dataSource={movies}
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          onChange={onTableChange}
          pagination={{
            current: page,
            pageSize,
            pageSizeOptions: [10, 20, 50],
            total,
            showSizeChanger: true,
          }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as number[]),
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
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
