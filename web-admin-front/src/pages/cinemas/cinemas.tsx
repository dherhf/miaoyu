import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  Tag,
  Space,
  Select,
  Card,
  message,
  Popconfirm,
} from 'antd';
import type { TableProps, FormProps } from 'antd';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Building2,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCinemaStore, useHallStore, useScheduleStore } from '../../stores';
import LocationPicker from '../../components/LocationPicker';

// ====================== 类型枚举定义 ======================
export enum CINEMA_STATUS {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

interface CinemaItem {
  id: number;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities: string[];
  rating: number | null;
  phone: string | null;
  status: CINEMA_STATUS;
}

interface CinemaFormValues {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  facilities: string[];
  rating: number | null;
  phone: string | null;
  status: CINEMA_STATUS;
}

const CINEMA_STATUS_LABELS = {
  [CINEMA_STATUS.ACTIVE]: { label: '营业中', color: 'green' },
  [CINEMA_STATUS.CLOSED]: { label: '停业', color: 'gray' },
};

const FACILITY_TAGS = [
  'IMAX',
  '杜比',
  '4DX',
  '巨幕厅',
  'Dolby Atmos',
  'Reald 3D',
  '儿童厅',
  'VIP厅',
];

// ====================== 表单子组件 ======================
interface CinemaFormProps {
  data: CinemaFormValues;
  isEdit: boolean;
  onChange: (vals: CinemaFormValues) => void;
}
const CinemaForm: React.FC<CinemaFormProps> = ({ data, isEdit, onChange }) => {
  const handleFieldChange = (field: keyof CinemaFormValues, val: unknown) => {
    onChange({ ...data, [field]: val });
  };

  // 切换设施标签
  const toggleFacility = (tag: string) => {
    const list = [...data.facilities];
    const idx = list.indexOf(tag);
    if (idx > -1) list.splice(idx, 1);
    else list.push(tag);
    handleFieldChange('facilities', list);
  };

  return (
    <Form layout="vertical" style={{ paddingTop: 4 }}>
      {/* 影院名称 */}
      <Form.Item label="影院名称" name="name" rules={[{ required: true, max: 50, message: '名称1-50字符' }]}>
        <Input
          value={data.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="请输入影院名称"
        />
      </Form.Item>

      {/* 地图选址：搜索框+搜索按钮+地图画布 */}
      <Form.Item label="地图选址" required>
        <LocationPicker
          value={{ address: data.address, longitude: data.longitude, latitude: data.latitude }}
          onChange={(loc) => {
            handleFieldChange('address', loc.address);
            handleFieldChange('longitude', loc.longitude);
            handleFieldChange('latitude', loc.latitude);
          }}
        />
      </Form.Item>

      {/* 详细地址：地图选点后自动回填，也可手动修改 */}
      <Form.Item label="详细地址" name="address" rules={[{ required: true, message: '请选择地址' }]}>
        <Input
          value={data.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="地图选点后自动回填"
          maxLength={200}
          prefix={<MapPin size={14} />}
        />
      </Form.Item>

      {/* 设施标签多选 */}
      <Form.Item label="设施标签">
        <Space wrap size={8}>
          {FACILITY_TAGS.map((tag) => (
            <Tag
              key={tag}
              onClick={() => toggleFacility(tag)}
              color={data.facilities.includes(tag) ? 'blue' : undefined}
              style={{ cursor: 'pointer' }}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      </Form.Item>

      {/* 评分 & 电话 */}
      <Space size={16} style={{ width: '100%' }}>
        <Form.Item label="评分" style={{ flex: 1, marginBottom: 0 }}>
          <InputNumber
            min={0}
            max={10}
            step={0.1}
            value={data.rating}
            onChange={(v) => handleFieldChange('rating', v)}
            placeholder="0-10"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="联系电话" style={{ flex: 1, marginBottom: 0 }}>
          <Input
            value={data.phone ?? ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="010-xxxxxxx"
            prefix={<Phone size={14} />}
          />
        </Form.Item>
      </Space>

      {/* 营业状态 */}
      <Form.Item label="营业状态">
        {isEdit ? (
          <Radio.Group
            value={data.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
          >
            <Radio value={CINEMA_STATUS.ACTIVE}>营业中</Radio>
            <Radio value={CINEMA_STATUS.CLOSED}>停业</Radio>
          </Radio.Group>
        ) : (
          <Tag color="green">营业中（新建默认）</Tag>
        )}
      </Form.Item>
    </Form>
  );
};

// ====================== 主页面 ======================
const CinemaManage: React.FC = () => {
  const navigate = useNavigate();
  const { cinemas, addCinema, updateCinema, deleteCinema } = useCinemaStore();
  const { getHallsByCinemaId } = useHallStore();
  const { schedules } = useScheduleStore();

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<CinemaItem | null>(null);
  // 表单值
  const [formData, setFormData] = useState<CinemaFormValues>({
    name: '',
    address: '',
    longitude: 0,
    latitude: 0,
    facilities: [],
    rating: null,
    phone: null,
    status: CINEMA_STATUS.ACTIVE,
  });
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 过滤列表
  const tableData = useMemo(() => {
    let list: CinemaItem[] = [...cinemas];
    if (searchText.trim()) {
      const kw = searchText.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(kw) || item.address.toLowerCase().includes(kw));
    }
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter);
    }
    return list;
  }, [cinemas, searchText, statusFilter]);

  // 搜索
  const handleSearch = () => {
    // 搜索由 useMemo 自动响应 searchText / statusFilter 变化
  };

  // 重置筛选
  const handleReset = () => {
    setSearchText('');
    setStatusFilter(undefined);
  };

  // 打开新增
  const openAdd = () => {
    setEditRow(null);
    setFormData({
      name: '',
      address: '',
      longitude: 0,
      latitude: 0,
      facilities: [],
      rating: null,
      phone: null,
      status: CINEMA_STATUS.ACTIVE,
    });
    setModalOpen(true);
  };

  // 打开编辑
  const openEdit = (record: CinemaItem) => {
    setEditRow(record);
    setFormData({
      name: record.name,
      address: record.address,
      longitude: record.longitude,
      latitude: record.latitude,
      facilities: record.facilities || [],
      rating: record.rating,
      phone: record.phone,
      status: record.status,
    });
    setModalOpen(true);
  };

  // 表单提交保存
  const handleSubmit: FormProps['onFinish'] = async () => {
    setLoading(true);
    try {
      if (editRow) {
        // 编辑
        const repeatName = cinemas.some((c) => c.name === formData.name && c.id !== editRow.id);
        if (repeatName) throw new Error('影院名称已存在');
        await updateCinema(editRow.id, formData);
        toast.success('影院更新成功');
      } else {
        // 新增
        const repeatName = cinemas.some((c) => c.name === formData.name);
        if (repeatName) throw new Error('影院名称已存在');
        await addCinema(formData);
        toast.success('影院新增成功');
      }
      setModalOpen(false);
    } catch (err: any) {
      message.error(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换营业/停业
  const toggleStatus = (record: CinemaItem) => {
    const targetStatus = record.status === CINEMA_STATUS.ACTIVE ? CINEMA_STATUS.CLOSED : CINEMA_STATUS.ACTIVE;
    const targetText = targetStatus === CINEMA_STATUS.ACTIVE ? '营业' : '停业';
    // 判断是否有未结束场次
    const hasUnFinishSchedule = schedules.some(
      (s) => String(s.cinemaId) === String(record.id) && s.status !== 'cancelled' && s.status !== 'ended'
    );
    if (targetStatus === CINEMA_STATUS.CLOSED && hasUnFinishSchedule) {
      Modal.confirm({
        title: '确认停业',
        content: '该影院存在未结束场次，停业后将暂停售票，确认继续？',
        okText: '确认停业',
        cancelText: '取消',
        onOk: () => {
          updateCinema(record.id, { status: targetStatus });
          toast.success(`影院已${targetText}`);
        },
      });
      return;
    }
    updateCinema(record.id, { status: targetStatus });
    toast.success(`影院已${targetText}`);
  };

  // 删除影院
  const handleDelete = (record: CinemaItem) => {
    // 校验关联影厅
    const hallList = getHallsByCinemaId(record.id);
    if (hallList.length > 0) {
      message.error(`该影院下存在${hallList.length}个影厅，无法删除`);
      return;
    }
    // 校验关联场次
    const hasSchedule = schedules.some((s) => String(s.cinemaId) === String(record.id));
    if (hasSchedule) {
      message.error('该影院存在排期记录，禁止删除');
      return;
    }
    Modal.confirm({
      title: '删除确认',
      content: `确定删除影院【${record.name}】？删除后不可恢复`,
      danger: true,
      onOk: () => {
        deleteCinema(record.id);
        toast.success('删除成功');
      },
    });
  };

  // 跳转到影厅页面（带参数）
  const goHallPage = (cid: number) => {
    navigate(`/halls?cinemaId=${cid}`);
  };

  // 表格列配置
  const columns: TableProps<CinemaItem>['columns'] = [
    {
      title: '影院名称',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (_, record) => (
        <Space size={12}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 color="#1677ff" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{record.address}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      width: 260,
    },
    {
      title: '设施',
      dataIndex: 'facilities',
      key: 'facilities',
      width: 180,
      render: (list: string[]) => {
        if (!list?.length) return '-';
        return (
          <Space size={4} wrap>
            {list.slice(0, 3).map((tag) => (
              <Tag key={tag} size="small">{tag}</Tag>
            ))}
            {list.length > 3 && <Tag size="small">+{list.length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (val) => val ?? '-',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      align: 'center',
      render: (val) => (val === null ? '-' : val.toFixed(1)),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (val: CINEMA_STATUS) => {
        const cfg = CINEMA_STATUS_LABELS[val];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_: any, record) => (
        <Space size={8}>
          <Button type="link" size="small" onClick={() => goHallPage(record.id)}>
            影厅管理
          </Button>
          <Button size="small" icon={<Edit2 />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            icon={record.status === CINEMA_STATUS.ACTIVE ? <PowerOff /> : <Power />}
            danger={record.status === CINEMA_STATUS.ACTIVE}
            onClick={() => toggleStatus(record)}
          >
            {record.status === CINEMA_STATUS.ACTIVE ? '停业' : '营业'}
          </Button>
          <Popconfirm title="确认删除该影院？" onConfirm={() => handleDelete(record)}>
            <Button size="small" danger icon={<Trash2 />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 0 }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>影院管理</h2>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>统一管理门店基础信息、营业状态</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
          新增影院
        </Button>
      </div>

      {/* 搜索筛选区 */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="搜索影院名称/地址"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
            prefix={<Search size={14} color="#999" />}
          />
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: CINEMA_STATUS.ACTIVE, label: '营业中' },
              { value: CINEMA_STATUS.CLOSED, label: '停业' },
            ]}
          />
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </div>

      {/* 表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<CinemaItem>
          rowKey="id"
          columns={columns}
          dataSource={tableData}
          pagination={{ pageSize: 10 }}
          bordered
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editRow ? '编辑影院' : '新增影院'}
        open={modalOpen}
        maskClosable={false}
        width={580}
        confirmLoading={loading}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
      >
        <CinemaForm data={formData} isEdit={!!editRow} onChange={setFormData} />
      </Modal>
    </div>
  );
};

export default CinemaManage;
