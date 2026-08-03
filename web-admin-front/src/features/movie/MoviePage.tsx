import React, { useState, useMemo } from 'react';
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
  Form,
  Input,
  InputNumber,
  DatePicker,
  Radio,
  Checkbox,
  Upload,
  Button,
  Space,
  Tag,
  Select,
  Card,
  message,
} from 'antd';
import type {
  TableProps,
  ModalProps,
  FormProps,
  UploadProps,
  CheckboxGroupProps,
} from 'antd';
import dayjs from 'dayjs';
import { useMovieStore, MOVIE_TYPES } from './store';
import { useScheduleStore } from '../schedule';

// ===================== TS 类型定义 =====================
type MovieStatus = 'showing' | 'offline';
interface MovieItem {
  id: number | string;
  name: string;
  types: string[];
  typeLabel: string;
  poster_url: string;
  rating: number | null;
  duration: number;
  release_date: string;
  director: string;
  actors: string;
  description: string;
  status: MovieStatus;
  hasSchedule?: boolean;
}
interface MovieFormValues {
  name: string;
  types: string[];
  poster_url: string;
  rating: number | null;
  duration: number;
  release_date: string;
  director: string;
  actors: string;
  description: string;
  status: MovieStatus;
}
interface MovieFormErr {
  name?: string;
  types?: string;
  poster_url?: string;
  rating?: string;
  duration?: string;
  release_date?: string;
  director?: string;
  actors?: string;
  description?: string;
  status?: string;
}

// ===================== 影片表单组件 =====================
interface MovieFormProps {
  data: MovieFormValues;
  errors: MovieFormErr;
  onChange: (vals: MovieFormValues) => void;
}
const MovieForm: React.FC<MovieFormProps> = ({ data, errors, onChange }) => {
  const updateField = (key: keyof MovieFormValues, val: any) => {
    onChange({ ...data, [key]: val });
  };

  // 图片上传处理
  const uploadConfig: UploadProps = {
    maxCount: 1,
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImg = file.type.startsWith('image/');
      if (!isImg) {
        message.error('仅支持图片文件');
        return false;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        updateField('poster_url', e.target?.result as string);
      };
      reader.readAsDataURL(file);
      return false;
    },
  };
  const uploadStyle: React.CSSProperties = { width: 120, height: 168 };

  return (
    <Form layout="vertical" style={{ gap: 16 }}>
      {/* 影片名称 */}
      <Form.Item
        label="影片名称"
        validateStatus={errors.name ? 'error' : ''}
        help={errors.name}
        required
      >
        <Input
          value={data.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="请输入影片名称"
        />
      </Form.Item>

      {/* 影片类型多选 */}
      <Form.Item
        label="影片类型"
        validateStatus={errors.types ? 'error' : ''}
        help={errors.types}
        required
      >
        <Checkbox.Group
          value={data.types}
          onChange={(vals) => updateField('types', vals)}
        >
          <Space wrap size={8}>
            {MOVIE_TYPES.map((t) => (
              <Checkbox key={t.value} value={t.value}>
                {t.label}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Form.Item>

      {/* 时长 */}
      <Form.Item
        label="时长(分钟)"
        validateStatus={errors.duration ? 'error' : ''}
        help={errors.duration}
        required
      >
        <InputNumber
          style={{ width: '100%' }}
          min={1}
          max={300}
          value={data.duration || null}
          onChange={(val) => updateField('duration', val)}
          placeholder="请输入时长"
        />
      </Form.Item>

      {/* 评分 & 上映日期 双栏 */}
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item
          label="评分"
          style={{ flex: 1, marginBottom: 0 }}
          validateStatus={errors.rating ? 'error' : ''}
          help={errors.rating}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            max={10}
            step={0.1}
            value={data.rating || null}
            onChange={(val) => updateField('rating', val)}
            placeholder="0-10"
          />
        </Form.Item>
        <Form.Item
          label="上映日期"
          style={{ flex: 1, marginBottom: 0 }}
          validateStatus={errors.release_date ? 'error' : ''}
          help={errors.release_date}
          required
        >
          <DatePicker
            style={{ width: '100%' }}
            value={data.release_date ? dayjs(data.release_date) : null}
            onChange={(d) => updateField('release_date', d?.format('YYYY-MM-DD') || '')}
            disabledDate={(d) => d.isAfter(dayjs())}
          />
        </Form.Item>
      </div>

      {/* 导演 & 主演 */}
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item
          label="导演"
          style={{ flex: 1, marginBottom: 0 }}
          validateStatus={errors.director ? 'error' : ''}
          help={errors.director}
          required
        >
          <Input
            value={data.director}
            onChange={(e) => updateField('director', e.target.value)}
            placeholder="请输入导演姓名"
          />
        </Form.Item>
        <Form.Item
          label="主演"
          style={{ flex: 1, marginBottom: 0 }}
          validateStatus={errors.actors ? 'error' : ''}
          help={errors.actors}
        >
          <Input
            value={data.actors}
            onChange={(e) => updateField('actors', e.target.value)}
            placeholder="多个主演用逗号分隔"
          />
        </Form.Item>
      </div>

      {/* 上下架状态 */}
      <Form.Item label="状态" required>
        <Radio.Group
          value={data.status}
          onChange={(e) => updateField('status', e.target.value)}
        >
          <Radio value="showing">上架</Radio>
          <Radio value="offline">下架</Radio>
        </Radio.Group>
      </Form.Item>

      {/* 海报上传 */}
      <Form.Item
        label="影片海报"
        validateStatus={errors.poster_url ? 'error' : ''}
        help={errors.poster_url}
        required
      >
        <Upload {...uploadConfig}>
          {data.poster_url ? (
            <img src={data.poster_url} alt="海报" style={uploadStyle} />
          ) : (
            <div style={{ ...uploadStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              <Film size={20} />
              <div style={{ fontSize: 12, marginTop: 4 }}>上传海报</div>
            </div>
          )}
        </Upload>
      </Form.Item>

      {/* 简介 */}
      <Form.Item
        label="影片简介"
        validateStatus={errors.description ? 'error' : ''}
        help={errors.description}
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          value={data.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="请输入影片简介"
          showCount
        />
      </Form.Item>
    </Form>
  );
};

// ===================== 主页面 Movie 影片管理 =====================
const MovieManage: React.FC = () => {
  const {
    movies,
    filters,
    sortConfig,
    pagination,
    setFilters,
    setSortConfig,
    setPagination,
    getPaginatedMovies,
    addMovie,
    updateMovie,
    batchUpdateStatus,
  } = useMovieStore();
  const { hasMovieSchedule } = useScheduleStore();

  // 本地状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasScheduleTip, setHasScheduleTip] = useState(false);
  const [formData, setFormData] = useState<MovieFormValues>({
    name: '',
    types: [],
    poster_url: '',
    rating: null,
    duration: 0,
    release_date: '',
    director: '',
    actors: '',
    description: '',
    status: 'showing',
  });
  const [formErrors, setFormErrors] = useState<MovieFormErr>({});

  // 表格列配置
  const tableColumns: TableProps<MovieItem>['columns'] = useMemo(() => [
    {
      title: '影片名称',
      dataIndex: 'name',
      render: (name, row) => (
        <Space size={12}>
          <div style={{ width: 40, height: 56, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            {row.poster_url ? (
              <img src={row.poster_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={18} color='#aaa' />
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
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
      render: (val) => (
        <span style={{ fontWeight: 600, color: val >= 8 ? '#16a34a' : val >= 6 ? '#ea580c' : '#666' }}>
          {val}
        </span>
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      align: 'center',
      sorter: true,
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
      dataIndex: 'release_date',
      align: 'center',
      sorter: true,
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
  ], []);

  // 筛选参数
  const searchValue = filters.keyword || '';
  const typeFilter = filters.type;
  const statusFilter = filters.status;
  const { list, total } = getPaginatedMovies();

  // 筛选重置
  const onResetFilter = () => {
    setFilters({ keyword: '', type: undefined, status: undefined });
    setSelectedIds([]);
    toast.success('筛选已重置');
  };

  // 分页切换
  const onChangePage = (page: number, pageSize: number) => {
    setPagination({ page, pageSize });
    setSelectedIds([]);
  };

  // 排序处理
  const onChangeSort = (field: string) => {
    setSortConfig(field);
  };

  // 打开新增弹窗
  const openAdd = () => {
    setEditingMovie(null);
    setHasScheduleTip(false);
    setFormData({
      name: '',
      types: [],
      poster_url: '',
      rating: null,
      duration: 0,
      release_date: '',
      director: '',
      actors: '',
      description: '',
      status: 'showing',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (row: MovieItem) => {
    setEditingMovie(row);
    const existSchedule = hasMovieSchedule(row.id);
    setHasScheduleTip(existSchedule);
    setFormData({
      ...row,
      release_date: row.release_date,
      rating: row.rating,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 单条上下架
  const handleToggle = (row: MovieItem, targetStatus: MovieStatus) => {
    const action = targetStatus === 'showing' ? '上架' : '下架';
    if (targetStatus === 'offline' && row.hasSchedule) {
      Modal.confirm({
        title: '确认下架',
        content: '该影片存在关联场次，下架后相关场次将不再展示，是否继续？',
        okText: '确认下架',
        okDanger: true,
        onOk: () => {
          batchUpdateStatus([String(row.id)], targetStatus);
          toast.success(`已${action}`);
        },
      });
      return;
    }
    batchUpdateStatus([String(row.id)], targetStatus);
    toast.success(`已${action}`);
  };

  // 批量操作
  const batchOperate = (targetStatus: MovieStatus) => {
    if (selectedIds.length === 0) return message.warning('请先勾选影片');
    const action = targetStatus === 'showing' ? '上架' : '下架';
    const hasRelated = selectedIds.some(id => {
      const m = movies.find(item => String(item.id) === id);
      return m?.hasSchedule;
    });
    if (targetStatus === 'offline' && hasRelated) {
      Modal.confirm({
        title: '批量下架',
        content: '选中部分影片存在关联场次，下架后场次隐藏，确认执行？',
        okText: '确认',
        okDanger: true,
        onOk: () => {
          batchUpdateStatus(selectedIds, targetStatus);
          toast.success(`成功${action}${selectedIds}部影片`);
          setSelectedIds([]);
        },
      });
      return;
    }
    batchUpdateStatus(selectedIds, targetStatus);
    toast.success(`成功${action}${selectedIds.length}部影片`);
    setSelectedIds([]);
  };

  // 表单校验
  const validateForm = () => {
    const err: MovieFormErr = {};
    // 影片名称
    if (!formData.name?.trim()) err.name = '请输入影片名称';
    else if (formData.name.length > 50) err.name = '名称不能超过50字符';
    else {
      const repeat = movies.some(m => m.name.trim() === formData.name.trim() && String(m.id) !== String(editingMovie?.id));
      if (repeat) err.name = '影片名称已存在';
    }
    // 类型
    if (!formData.types || formData.types.length === 0) err.types = '至少选择一种影片类型';
    // 海报
    if (!formData.poster_url) err.poster_url = '请上传海报图片';
    // 评分
    if (formData.rating === null || formData.rating === undefined) err.rating = '请输入评分';
    else if (formData.rating < 0 || formData.rating > 10) err.rating = '评分区间0-10';
    // 时长
    if (!formData.duration || formData.duration < 1 || formData.duration > 300) err.duration = '时长1-300分钟';
    // 上映日期
    if (!formData.release_date) err.release_date = '请选择上映日期';
    // 导演
    if (formData.director && formData.director.length > 50) err.director = '导演名称不超过50字符';
    // 主演
    if (formData.actors && formData.actors.length > 100) err.actors = '主演信息不超过100字符';
    // 简介
    if (formData.description && formData.description.length > 500) err.description = '简介最多500字';

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  // 保存提交
  const onSubmitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const typeLabel = formData.types.map(v => MOVIE_TYPES.find(t => t.value === v)?.label).join('、');
      const payload = { ...formData, typeLabel };
      if (editingMovie) {
        await updateMovie(editingMovie.id, payload);
        toast.success('影片更新成功');
      } else {
        await addMovie(payload);
        toast.success('新增影片成功');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 0 }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>影片管理</h2>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>管理上架/下架影片基础资料</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>新增影片</Button>
      </div>

      {/* 搜索筛选栏 */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="搜索影片/导演/主演"
            allowClear
            value={searchValue}
            onChange={(e) => setFilters({ keyword: e.target.value })}
            style={{ width: 320 }}
            prefix={<Search size={14} color="#999" />}
          />
          <Select
            placeholder="全部类型"
            allowClear
            value={typeFilter}
            onChange={(v) => setFilters({ type: v })}
            style={{ width: 140 }}
          >
            {MOVIE_TYPES.map(item => (
              <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
            ))}
          </Select>
          <Select
            placeholder="全部状态"
            allowClear
            value={statusFilter}
            onChange={(v) => setFilters({ status: v })}
            style={{ width: 120 }}
          >
            <Select.Option value="showing">上架</Select.Option>
            <Select.Option value="offline">下架</Select.Option>
          </Select>
          <Button onClick={() => setSelectedIds([])}>搜索</Button>
          {(searchValue || typeFilter || statusFilter) && (
            <Button onClick={onResetFilter}>重置</Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <span style={{ fontSize: 14, color: '#666' }}>已选{selectedIds.length}部</span>
              <Button onClick={() => batchOperate('showing')}>批量上架</Button>
              <Button danger onClick={() => batchOperate('offline')}>批量下架</Button>
            </>
          )}
        </Space>
      </div>

      {/* 表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<MovieItem>
        rowKey={(row) => String(row.id)}
        columns={tableColumns}
        dataSource={list}
        bordered
        scroll={{ x: 'max-content' }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          pageSizeOptions: [10, 20, 50],
          total,
          onChange: onChangePage,
          showSizeChanger: true,
        }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
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
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 500, color: '#92400e' }}>该影片存在关联场次</div>
              <div style={{ fontSize: 13, color: '#b45309', marginTop: 2 }}>修改信息会影响排期展示，请谨慎编辑</div>
            </div>
          </div>
        )}
        <MovieForm data={formData} errors={formErrors} onChange={setFormData} />
      </Modal>
    </div>
  );
};

export default MovieManage;