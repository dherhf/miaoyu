import { useState, useMemo, useEffect } from 'react';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Table, Modal, Input, Button, Select, Tag, Space, Typography, Card, Form, message } from 'antd';
import type { TableProps } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCinemaStore } from '../cinema';
import {
  useHallStore,
  HALL_TYPES,
  HALL_STATUS_LABELS,
  generateSeats,
} from './store';
import { hallApi } from './api';
import { useScheduleStore } from '../schedule';
import type { HallItem, HallFormValues } from './types';
import { mapHallCell } from './types';
import { HallForm } from './HallForm';
import styles from './HallPage.module.css';

export function HallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');
  const { cinemas } = useCinemaStore();
  const { halls, loading, fetchHalls, getHallsByCinemaId, addHall, updateHall, deleteHall } = useHallStore();
  const { schedules } = useScheduleStore();
  const [form] = Form.useForm<HallFormValues>();

  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam || '');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<HallItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam); }, [cinemaIdParam]);
  useEffect(() => { if (selectedCinemaId) void fetchHalls({ cinemaId: selectedCinemaId }); }, [selectedCinemaId, fetchHalls]);
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);
  const filteredHalls = useMemo(() => {
    let list = selectedCinemaId ? getHallsByCinemaId(selectedCinemaId) : [...halls];
    if (keyword) list = list.filter(h => h.name.toLowerCase().includes(keyword.toLowerCase()));
    if (typeFilter) list = list.filter(h => h.type === typeFilter);
    return list;
  }, [halls, selectedCinemaId, keyword, typeFilter, getHallsByCinemaId]);

  // 表格列配置
  const tableColumns: TableProps<HallItem>['columns'] = [
    {
      title: '影厅名称',
      dataIndex: 'name',
      render: (name, row) => {
        const typeItem = HALL_TYPES.find(t => t.value === row.type);
        return (
          <Space size={12}>
            <div className={styles.hallIconBox} style={{ background: `${typeItem?.color || 'blue'}10` }}>
              <AppstoreOutlined style={{ fontSize: 20, color: `${typeItem?.color || '#1677ff'}` }} />
            </div>
            <div>
              <Typography.Text strong>{name}</Typography.Text>
              <div><Typography.Text type='secondary' className={styles.hallTypeLabel}>{typeItem?.label}</Typography.Text></div>
            </div>
          </Space>
        );
      },
    },
    { title: '座位布局', dataIndex: 'rowCount', align: 'center', render: (r, row) => `${r} × ${row.colCount}` },
    { title: '可用座位', dataIndex: 'totalSeats', align: 'center', render: v => <Space size={4}><TeamOutlined style={{ fontSize: 14 }} /><Typography.Text className={styles.availableSeatsText}>{v}</Typography.Text></Space> },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      render: val => {
        const cfg = HALL_STATUS_LABELS[val] || HALL_STATUS_LABELS.active;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      width: 160,
      align: 'center',
      render: (_v, row) => (
        <Space size={8}>
          <Button size='small' icon={<EditOutlined style={{ fontSize: 14 }} />} onClick={() => openEdit(row)}>编辑</Button>
          <Button size='small' danger icon={<DeleteOutlined style={{ fontSize: 14 }} />} onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleSearch = () => setSelectedIds([]);
  const handleReset = () => { setKeyword(''); setTypeFilter(undefined); setSelectedIds([]); };
  const openAdd = () => {
    if (!selectedCinemaId) return message.error('请先选择影院');
    setEditingHall(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = async (hall: HallItem) => {
    setEditingHall(hall);
    let seats = hall.seats?.length ? hall.seats : generateSeats(hall.rowCount, hall.colCount);
    try {
      const detail = await hallApi.getHallDetail(hall.id);
      if (detail.cells?.length) seats = detail.cells.map(mapHallCell);
    } catch { /* fallback to generated seats */ }
    form.setFieldsValue({
      name: hall.name,
      type: hall.type,
      seats,
    });
    setModalOpen(true);
  };
  // 保存影厅
  const submitForm = async () => {
    if (!selectedCinemaId) return;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const rowCnt = values.seats.length ? Math.max(...values.seats.map(s => s.row)) : 0;
      const colCnt = values.seats.length ? Math.max(...values.seats.map(s => s.col)) : 0;
      const savePayload = { ...values, rowCount: rowCnt, colCount: colCnt };
      if (editingHall) {
        const hasSchedule = schedules.some(s => String(s.hallId) === String(editingHall.id) && s.status !== 'cancelled' && s.status !== 'ended');
        if (hasSchedule && (rowCnt !== editingHall.rowCount || colCnt !== editingHall.colCount)) {
          return message.error('存在活跃排期，不可修改行列数量');
        }
        await updateHall(editingHall.id, savePayload);
        message.success('影厅更新成功');
      } else {
        await addHall({ ...savePayload, cinemaId: selectedCinemaId, status: 'active' });
        message.success('新增影厅成功');
      }
      setModalOpen(false);
    } catch (e: any) {
      if (e?.errorFields) return; // antd 校验失败，不额外提示
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };
  // 删除影厅
  const handleDelete = (hall: HallItem) => {
    const hasSchedule = schedules.some(s => String(s.hallId) === String(hall.id) && s.status !== 'cancelled' && s.status !== 'ended');
    if (hasSchedule) return message.error('该影厅有排期，无法删除');
    Modal.confirm({ title: '删除确认', content: `确定删除【${hall.name}】？删除不可恢复`, okText: '确认删除', okButtonProps: { danger: true }, onOk: async () => { await deleteHall(hall.id); message.success('删除成功'); setSelectedIds(prev => prev.filter(id => id !== hall.id)); } });
  };
  const backCinema = () => { setSelectedCinemaId(''); navigate('/halls'); };

  return (
    <div className={styles.pageWrap}>
      {/* 页面头部 */}
      <div className={styles.headerWrap}>
        <div>
          {selectedCinemaId && (
            <Button type='link' size='small' icon={<ArrowLeftOutlined style={{ fontSize: 16 }} />} onClick={backCinema} className={styles.backButton}>返回影院列表</Button>
          )}
          <Typography.Title level={3} className={styles.pageTitle}>
            {currentCinema ? `${currentCinema.name} - 影厅管理` : '影厅管理'}
          </Typography.Title>
          <Typography.Text type='secondary'>
            {currentCinema ? '管理该影院所有影厅座位布局' : '请先选择影院查看对应影厅'}
          </Typography.Text>
        </div>
        {selectedCinemaId && <Button type='primary' icon={<PlusOutlined style={{ fontSize: 16 }} />} onClick={openAdd}>新增影厅</Button>}
      </div>

      {/* 未选影院 - 选择卡片 */}
      {!selectedCinemaId && (
        <div className={styles.selectCinemaBox}>
          <div className={styles.selectCinemaIcon}>
            <EnvironmentOutlined style={{ fontSize: 32, color: '#1677ff' }} />
          </div>
          <Typography.Title level={5} className={styles.selectCinemaTitle}>请选择影院</Typography.Title>
          <Typography.Text type='secondary' className={styles.selectCinemaHint}>选择对应影院后管理影厅</Typography.Text>
          <div className={styles.cinemaGrid}>
            {cinemas.map(c => (
              <Card hoverable key={c.id} onClick={() => { setSelectedCinemaId(String(c.id)); navigate(`/halls?cinemaId=${c.id}`); }} styles={{ body: { padding: 16 } }}>
                <Typography.Text strong>{c.name}</Typography.Text>
                <div className={styles.cinemaCardAddress}>{c.address}</div>
                <div className={styles.cinemaCardHalls}>
                  <TeamOutlined style={{ fontSize: 12 }} className={styles.cinemaCardHallIcon} /> {c.hallCount} 个影厅
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 已选影院：筛选+表格 */}
      {selectedCinemaId && (
        <>
          <div className={styles.filterBox}>
            <Space size={12}>
              <Input placeholder='搜索影厅名称' value={keyword} onChange={e => setKeyword(e.target.value)} className={styles.searchInput} prefix={<SearchOutlined style={{ fontSize: 14, color: '#999' }} />} allowClear />
              <Select placeholder='全部类型' allowClear value={typeFilter} onChange={v => setTypeFilter(v)} className={styles.typeSelect}>
                {HALL_TYPES.map(t => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}
              </Select>
              <Button type='primary' onClick={handleSearch}>搜索</Button>
              {(keyword || typeFilter) && <Button onClick={handleReset}>重置</Button>}
            </Space>
          </div>
          <Card styles={{ body: { padding: 0 } }}>
            <Table<HallItem>
              rowKey='id'
              columns={tableColumns}
              dataSource={filteredHalls}
              loading={loading}
              pagination={{ pageSize: 10 }}
              bordered
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      )}

      {/* 新增/编辑影厅弹窗 */}
      <Modal
        title={editingHall ? '编辑影厅' : '新增影厅'}
        open={modalOpen}
        maskClosable={false}
        width={580}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <HallForm form={form} />
      </Modal>
    </div>
  );
}
