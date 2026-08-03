import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Input,
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
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCinemaStore } from './store';
import { useHallStore } from '../hall';
import { useScheduleStore } from '../schedule';
import type { CinemaItem, CinemaStatus, CinemaCreateParams } from './types';
import { CinemaForm, CINEMA_STATUS, CINEMA_STATUS_LABELS } from './CinemaForm';
import type { CinemaFormValues } from './CinemaForm';
import styles from './CinemaPage.module.css';

export function CinemaManage() {
  const navigate = useNavigate();
  const { cinemas, loading, fetchCinemas, addCinema, updateCinema, toggleCinemaStatus, deleteCinema } = useCinemaStore();
  const { getHallsByCinemaId } = useHallStore();
  const { schedules } = useScheduleStore();

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const [statusFilter, setStatusFilter] = useState<CinemaStatus | undefined>(undefined);

  // 初始加载
  useEffect(() => {
    void fetchCinemas();
  }, [fetchCinemas]);

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
    setSubmitting(true);
    try {
      // 剥离 status，API 的 create/update 不接受该字段
      const { status, ...rest } = formData;
      const payload: CinemaCreateParams = {
        ...rest,
        rating: rest.rating ?? undefined,
        phone: rest.phone ?? undefined,
        facilities: rest.facilities.length > 0 ? rest.facilities : undefined,
      };
      if (editRow) {
        const repeatName = cinemas.some((c) => c.name === formData.name && c.id !== editRow.id);
        if (repeatName) {
          void message.error('影院名称已存在');
          return;
        }
        await updateCinema(editRow.id, payload);
        // 编辑时若状态变更，走独立的停业/营业接口
        if (editRow.status !== status) {
          await toggleCinemaStatus(editRow.id, status);
        }
        message.success('影院更新成功');
      } else {
        const repeatName = cinemas.some((c) => c.name === formData.name);
        if (repeatName) {
          void message.error('影院名称已存在');
          return;
        }
        await addCinema(payload);
        message.success('影院新增成功');
      }
      setModalOpen(false);
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换营业/停业
  const toggleStatus = async (record: CinemaItem) => {
    const targetStatus: CinemaStatus = record.status === CINEMA_STATUS.ACTIVE ? CINEMA_STATUS.CLOSED : CINEMA_STATUS.ACTIVE;
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
        onOk: async () => {
          await toggleCinemaStatus(record.id, targetStatus);
          message.success(`影院已${targetText}`);
        },
      });
      return;
    }
    await toggleCinemaStatus(record.id, targetStatus);
    message.success(`影院已${targetText}`);
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
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteCinema(record.id);
        message.success('删除成功');
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
            className={styles.cinemaIcon}
          >
            <Building2 color="#1677ff" size={18} />
          </div>
          <div>
            <div className={styles.cinemaName}>{record.name}</div>
            <div className={styles.cinemaAddress}>{record.address}</div>
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
              <Tag key={tag}>{tag}</Tag>
            ))}
            {list.length > 3 && <Tag>+{list.length - 3}</Tag>}
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
      render: (val: CinemaStatus) => {
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
            onClick={() => void toggleStatus(record)}
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
    <div className={styles.page}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>影院管理</h2>
          <p className={styles.pageSubtitle}>统一管理门店基础信息、营业状态</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
          新增影院
        </Button>
      </div>

      {/* 搜索筛选区 */}
      <div className={styles.filterArea}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="搜索影院名称/地址"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.searchInput}
            prefix={<Search size={14} color="#999" />}
          />
          <Select
            placeholder="全部状态"
            allowClear
            className={styles.statusSelect}
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
          loading={loading}
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
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
      >
        <CinemaForm data={formData} isEdit={!!editRow} onChange={setFormData} />
      </Modal>
    </div>
  );
}
