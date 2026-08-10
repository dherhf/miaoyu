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

/**
 * 影院管理页面组件
 *
 * 功能：
 * 1. 影院列表展示（ProTable，支持按名称和状态搜索）
 * 2. 新增影院（弹出表单，含地图选点）
 * 3. 编辑影院信息
 * 4. 影院营业/停业切换（停业前检查是否有未结束场次）
 * 5. 影院名称查重（客户端校验）
 */
export function CinemaManage() {
  // ProTable 操作引用（用于手动刷新表格）
  const actionRef = useRef<ActionType>(null);
  const { message, modal } = App.useApp();
  // 影院 store
  const { fetchCinemas, addCinema, updateCinema, toggleCinemaStatus } = useCinemaStore();
  // 排期 store（用于停业前检查未结束场次）
  const { schedules } = useScheduleStore();

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 当前编辑的影院记录（null 表示新增模式）
  const [editRow, setEditRow] = useState<CinemaItem | null>(null);
  // 表单数据
  const [formData, setFormData] = useState<CinemaFormValues>({
    name: '',
    address: '',
    longitude: 0,
    latitude: 0,
    facilities: [],
    rating: null,
    phone: null,
  });

  /**
   * 打开新增影院弹窗
   * 重置表单数据为初始空值
   */
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

  /**
   * 打开编辑影院弹窗
   * 将选中影院的数据回填到表单
   */
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

  /**
   * 表单提交处理（新增或编辑）
   * 1. 客户端校验影院名称是否重复
   * 2. 调用 store 的 addCinema 或 updateCinema
   * 3. 成功后关闭弹窗并刷新表格
   */
  const handleSubmit: FormProps['onFinish'] = async () => {
    setSubmitting(true);
    try {
      // 构建提交参数，空值转为 undefined
      const payload: CinemaCreateParams = {
        ...formData,
        rating: formData.rating ?? undefined,
        phone: formData.phone ?? undefined,
        facilities: formData.facilities.length > 0 ? formData.facilities : undefined,
      };
      // 获取当前所有影院列表用于查重
      const allCinemas = useCinemaStore.getState().cinemas;
      if (editRow) {
        // 编辑模式：排除自身后检查名称是否重复
        const repeatName = allCinemas.some((c) => c.name === formData.name && c.id !== editRow.id);
        if (repeatName) {
          void message.error('影院名称已存在');
          return;
        }
        await updateCinema(editRow.id, payload);
        message.success('影院更新成功');
      } else {
        // 新增模式：检查名称是否重复
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

  /**
   * 切换影院营业/停业状态
   * - 停业前检查是否有未结束场次，有则弹窗确认
   * - 营业→停业或停业→营业
   */
  const toggleStatus = async (record: CinemaItem) => {
    // 计算目标状态（当前营业→停业，当前停业→营业）
    const targetStatus: CinemaStatus =
      record.status === CINEMA_STATUS.ACTIVE ? CINEMA_STATUS.CLOSED : CINEMA_STATUS.ACTIVE;
    const targetText = targetStatus === CINEMA_STATUS.ACTIVE ? '营业' : '停业';
    // 检查是否有未结束/未取消的场次
    const hasUnFinishSchedule = schedules.some(
      (s) => String(s.cinemaId) === String(record.id) && s.status !== 'cancelled' && s.status !== 'ended',
    );
    // 停业且有未结束场次：弹窗确认
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
    // 无冲突直接切换
    await toggleCinemaStatus(record.id, targetStatus);
    message.success(`影院已${targetText}`);
    actionRef.current?.reload();
  };

  // ProTable 列配置
  const columns: ProColumns<CinemaItem>[] = [
    {
      title: '影院名称',
      dataIndex: 'name',
      width: 240,
      // 自定义渲染：图标 + 名称 + 地址
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
      // 设施标签渲染
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
      // 评分渲染：星星图标 + 数值
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
      // 状态筛选下拉
      valueType: 'select',
      valueEnum: {
        active: { text: '营业中' },
        closed: { text: '停业' },
      },
      // 状态标签渲染
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
      // 操作按钮：编辑 + 营业/停业切换
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
      {/* 影院列表 ProTable */}
      <ProTable<CinemaItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          // 调用 store 获取影院列表
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
        pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50], showSizeChanger: true }}
        bordered
        scroll={{ x: 'max-content' }}
        headerTitle="影院管理"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增影院
          </Button>,
        ]}
      />

      {/* 新增/编辑影院弹窗 */}
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
