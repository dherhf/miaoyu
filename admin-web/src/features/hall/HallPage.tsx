import { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Modal, Button, Tag, Space, Typography, Card, Form, App } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
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
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');
  const { cinemas } = useCinemaStore();
  const { fetchHalls, addHall, updateHall, deleteHall } = useHallStore();
  const { schedules } = useScheduleStore();
  const [form] = Form.useForm<HallFormValues>();

  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<HallItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam); }, [cinemaIdParam]);
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);

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
      actionRef.current?.reload();
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
    modal.confirm({ title: '删除确认', content: `确定删除【${hall.name}】？删除不可恢复`, okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { await deleteHall(hall.id); message.success('删除成功'); actionRef.current?.reload(); } });
  };
  const backCinema = () => { setSelectedCinemaId(''); navigate('/halls'); };

  const columns: ProColumns<HallItem>[] = [
    {
      title: '影厅名称',
      dataIndex: 'name',
      render: (_, record) => {
        const typeItem = HALL_TYPES.find(t => t.value === record.type);
        return (
          <Space size={12}>
            <div className={styles.hallIconBox} style={{ background: `${typeItem?.color || 'blue'}10` }}>
              <AppstoreOutlined style={{ fontSize: 20, color: `${typeItem?.color || '#1677ff'}` }} />
            </div>
            <div>
              <Typography.Text strong>{record.name}</Typography.Text>
              <div><Typography.Text type='secondary' className={styles.hallTypeLabel}>{typeItem?.label}</Typography.Text></div>
            </div>
          </Space>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      hideInTable: true,
      valueType: 'select',
      valueEnum: Object.fromEntries(HALL_TYPES.map(t => [t.value, { text: t.label }])),
    },
    {
      title: '座位布局',
      dataIndex: 'rowCount',
      align: 'center',
      search: false,
      render: (_, record) => `${record.rowCount} × ${record.colCount}`,
    },
    {
      title: '可用座位',
      dataIndex: 'totalSeats',
      align: 'center',
      search: false,
      render: (_, record) => (
        <Space size={4}>
          <TeamOutlined style={{ fontSize: 14 }} />
          <Typography.Text className={styles.availableSeatsText}>{record.totalSeats}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      valueType: 'select',
      valueEnum: {
        active: { text: '启用' },
        inactive: { text: '停用' },
      },
      render: (_, record) => {
        const cfg = HALL_STATUS_LABELS[record.status] || HALL_STATUS_LABELS.active;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      search: false,
      render: (_, record) => (
        <Space size={8}>
          <Button size='small' icon={<EditOutlined style={{ fontSize: 14 }} />} onClick={() => openEdit(record)}>编辑</Button>
          <Button size='small' danger icon={<DeleteOutlined style={{ fontSize: 14 }} />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

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

      {/* 已选影院：ProTable */}
      {selectedCinemaId && (
        <ProTable<HallItem>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            await fetchHalls({
              cinemaId: selectedCinemaId,
              name: params.name || undefined,
              screenType: params.type || undefined,
              status: params.status === 'active' ? 1 : params.status === 'inactive' ? 0 : undefined,
              page: params.current ?? 1,
              size: params.pageSize ?? 10,
            });
            const state = useHallStore.getState();
            return {
              data: state.halls,
              success: true,
              total: state.total,
            };
          }}
          search={{ labelWidth: 'auto', span: 6, defaultCollapsed: false }}
          pagination={{ pageSize: 10, pageSizeOptions: [10, 20, 50], showSizeChanger: true }}
          bordered
          scroll={{ x: 'max-content' }}
          headerTitle={`${currentCinema?.name ?? ''} 影厅列表`}
        />
      )}

      {/* 新增/编辑影厅弹窗 */}
      <Modal
        title={editingHall ? '编辑影厅' : '新增影厅'}
        open={modalOpen}
        maskClosable={false}
        width={580}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <HallForm form={form} />
      </Modal>
    </div>
  );
}
