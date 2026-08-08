import { useState, useRef } from 'react';
import { Button, Modal, Tag, Space, App } from 'antd';
import type { FormProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  PlayCircleOutlined,
  StopOutlined,
  BankOutlined,
  StarFilled,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { useCinemaStore } from './store';
import { useScheduleStore } from '../schedule';
import type { CinemaItem, CinemaStatus, CinemaCreateParams } from './types';
import { CinemaForm, CINEMA_STATUS, CINEMA_STATUS_LABELS } from './CinemaForm';
import type { CinemaFormValues } from './CinemaForm';
import styles from './CinemaPage.module.css';

export function CinemaManage() {
  const actionRef = useRef<ActionType>(null);
  const { message, modal } = App.useApp();
  const { fetchCinemas, addCinema, updateCinema, toggleCinemaStatus } = useCinemaStore();
  const { schedules } = useScheduleStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRow, setEditRow] = useState<CinemaItem | null>(null);
  const [formData, setFormData] = useState<CinemaFormValues>({
    name: '',
    address: '',
    longitude: 0,
    latitude: 0,
    facilities: [],
    rating: null,
    phone: null,
  });

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
    });
    setModalOpen(true);
  };

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
    });
    setModalOpen(true);
  };

  const handleSubmit: FormProps['onFinish'] = async () => {
    setSubmitting(true);
    try {
      const payload: CinemaCreateParams = {
        ...formData,
        rating: formData.rating ?? undefined,
        phone: formData.phone ?? undefined,
        facilities: formData.facilities.length > 0 ? formData.facilities : undefined,
      };
      const allCinemas = useCinemaStore.getState().cinemas;
      if (editRow) {
        const repeatName = allCinemas.some((c) => c.name === formData.name && c.id !== editRow.id);
        if (repeatName) {
          void message.error('影院名称已存在');
          return;
        }
        await updateCinema(editRow.id, payload);
        message.success('影院更新成功');
      } else {
        const repeatName = allCinemas.some((c) => c.name === formData.name);
        if (repeatName) {
          void message.error('影院名称已存在');
          return;
        }
        await addCinema(payload);
        message.success('影院新增成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (record: CinemaItem) => {
    const targetStatus: CinemaStatus =
      record.status === CINEMA_STATUS.ACTIVE ? CINEMA_STATUS.CLOSED : CINEMA_STATUS.ACTIVE;
    const targetText = targetStatus === CINEMA_STATUS.ACTIVE ? '营业' : '停业';
    const hasUnFinishSchedule = schedules.some(
      (s) => String(s.cinemaId) === String(record.id) && s.status !== 'cancelled' && s.status !== 'ended',
    );
    if (targetStatus === CINEMA_STATUS.CLOSED && hasUnFinishSchedule) {
      modal.confirm({
        title: '确认停业',
        content: '该影院存在未结束场次，停业后将暂停售票，确认继续？',
        okText: '确认停业',
        cancelText: '取消',
        onOk: async () => {
          await toggleCinemaStatus(record.id, targetStatus);
          message.success(`影院已${targetText}`);
          actionRef.current?.reload();
        },
      });
      return;
    }
    await toggleCinemaStatus(record.id, targetStatus);
    message.success(`影院已${targetText}`);
    actionRef.current?.reload();
  };

  const columns: ProColumns<CinemaItem>[] = [
    {
      title: '影院名称',
      dataIndex: 'name',
      width: 240,
      render: (_, record) => (
        <Space size={12}>
          <div className={styles.cinemaIcon}>
            <BankOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          </div>
          <div>
            <div className={styles.cinemaName}>{record.name}</div>
            <div className={styles.cinemaAddress}>{record.address}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '设施',
      dataIndex: 'facilities',
      width: 180,
      search: false,
      render: (_, record) => {
        const list = record.facilities;
        if (!list?.length) return '-';
        return (
          <Space size={4} wrap>
            {list.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 140,
      search: false,
      render: (_, record) => record.phone ?? '-',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 100,
      align: 'center',
      search: false,
      render: (_, record) =>
        record.rating === null ? (
          '-'
        ) : (
          <span className={styles.ratingCell}>
            <StarFilled className={styles.ratingStar} />
            {record.rating.toFixed(1)}
          </span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      valueType: 'select',
      valueEnum: {
        active: { text: '营业中' },
        closed: { text: '停业' },
      },
      render: (_, record) => {
        const cfg = CINEMA_STATUS_LABELS[record.status];
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
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            icon={record.status === CINEMA_STATUS.ACTIVE ? <StopOutlined /> : <PlayCircleOutlined />}
            danger={record.status === CINEMA_STATUS.ACTIVE}
            onClick={() => void toggleStatus(record)}
          >
            {record.status === CINEMA_STATUS.ACTIVE ? '停业' : '营业'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <ProTable<CinemaItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          await fetchCinemas({
            keyword: params.name || undefined,
            status: params.status === 'active' ? 1 : params.status === 'closed' ? 0 : undefined,
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
          });
          const all = useCinemaStore.getState().cinemas;
          return {
            data: all,
            success: true,
            total: useCinemaStore.getState().total ?? all.length,
          };
        }}
        search={{ labelWidth: 'auto', span: 8, defaultCollapsed: false }}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: 'max-content' }}
        headerTitle="影院管理"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增影院
          </Button>,
        ]}
      />

      <Modal
        title={editRow ? '编辑影院' : '新增影院'}
        open={modalOpen}
        maskClosable={false}
        width={580}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
      >
        <CinemaForm data={formData} isEdit={!!editRow} onChange={setFormData} />
      </Modal>
    </div>
  );
}
