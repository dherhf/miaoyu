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

/**
 * 影厅管理页面组件
 *
 * 功能：
 * 1. 未选影院时：展示影院卡片列表，点击选择影院
 * 2. 选中影院后：展示该影院的影厅列表（ProTable）
 * 3. 新增影厅：填写名称、类型，编辑座位布局
 * 4. 编辑影厅：拉取详情获取座位布局，回填表单
 * 5. 删除影厅：有排期的影厅不允许删除
 * 6. URL 参数 cinemaId 支持直接进入某影院的影厅管理
 *
 * 排期冲突检查：编辑影厅时如果修改行列数，检查是否有活跃排期
 */
export function HallPage() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  // 从 URL 获取影院 ID 参数
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');
  // 影院 store（用于获取影院列表供选择）
  const { cinemas } = useCinemaStore();
  // 影厅 store
  const { fetchHalls, addHall, updateHall, deleteHall } = useHallStore();
  // 排期 store（用于检查影厅是否有活跃排期）
  const { schedules } = useScheduleStore();
  const [form] = Form.useForm<HallFormValues>();

  // 当前选中的影院 ID
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam || '');
  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  // 当前编辑的影厅（null 表示新增模式）
  const [editingHall, setEditingHall] = useState<HallItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 同步 URL 参数到选中状态
  useEffect(() => { if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam); }, [cinemaIdParam]);
  // 当前选中的影院对象
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);

  /**
   * 打开新增影厅弹窗
   * 必须先选择影院
   */
  const openAdd = () => {
    if (!selectedCinemaId) return message.error('请先选择影院');
    setEditingHall(null);
    form.resetFields();
    setModalOpen(true);
  };

  /**
   * 打开编辑影厅弹窗
   * 先用列表数据生成座位，再拉取详情获取完整布局
   */
  const openEdit = async (hall: HallItem) => {
    setEditingHall(hall);
    // 先用列表数据生成默认座位
    let seats = hall.seats?.length ? hall.seats : generateSeats(hall.rowCount, hall.colCount);
    try {
      // 拉取详情获取完整座位布局
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

  /**
   * 保存影厅（新增或编辑）
   * 1. 计算行列数（取座位列表中的最大行列值）
   * 2. 编辑模式：检查是否有活跃排期，有则不允许修改行列数
   * 3. 新增模式：设置影院 ID 和默认状态
   * 4. 成功后关闭弹窗并刷新列表
   */
  const submitForm = async () => {
    if (!selectedCinemaId) return;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      // 从座位列表计算行列数
      const rowCnt = values.seats.length ? Math.max(...values.seats.map(s => s.row)) : 0;
      const colCnt = values.seats.length ? Math.max(...values.seats.map(s => s.col)) : 0;
      const savePayload = { ...values, rowCount: rowCnt, colCount: colCnt };
      if (editingHall) {
        // 编辑模式：检查是否有活跃排期，有则不允许修改行列数
        const hasSchedule = schedules.some(s => String(s.hallId) === String(editingHall.id) && s.status !== 'cancelled' && s.status !== 'ended');
        if (hasSchedule && (rowCnt !== editingHall.rowCount || colCnt !== editingHall.colCount)) {
          return message.error('存在活跃排期，不可修改行列数量');
        }
        await updateHall(editingHall.id, savePayload);
        message.success('影厅更新成功');
      } else {
        // 新增模式
        await addHall({ ...savePayload, cinemaId: selectedCinemaId, status: 'active' });
        message.success('新增影厅成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      // antd 校验失败不额外提示
      if (e?.errorFields) return;
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 删除影厅
   * 有排期的影厅不允许删除
   */
  const handleDelete = (hall: HallItem) => {
    // 检查是否有活跃排期
    const hasSchedule = schedules.some(s => String(s.hallId) === String(hall.id) && s.status !== 'cancelled' && s.status !== 'ended');
    if (hasSchedule) return message.error('该影厅有排期，无法删除');
    // 确认弹窗
    modal.confirm({ title: '删除确认', content: `确定删除【${hall.name}】？删除不可恢复`, okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { await deleteHall(hall.id); message.success('删除成功'); actionRef.current?.reload(); } });
  };

  /** 返回影院选择页 */
  const backCinema = () => { setSelectedCinemaId(''); navigate('/halls'); };

  // ProTable 列配置
  const columns: ProColumns<HallItem>[] = [
    {
      title: '影厅名称',
      dataIndex: 'name',
      // 自定义渲染：类型图标 + 名称 + 类型标签
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
      // 在表格中隐藏，仅用于搜索筛选
      hideInTable: true,
      valueType: 'select',
      valueEnum: Object.fromEntries(HALL_TYPES.map(t => [t.value, { text: t.label }])),
    },
    {
      title: '座位布局',
      dataIndex: 'rowCount',
      align: 'center',
      search: false,
      // 显示 行 × 列
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
      // 操作按钮：编辑 + 删除
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
          {/* 选中影院时显示返回按钮 */}
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
        {/* 选中影院时显示新增按钮 */}
        {selectedCinemaId && <Button type='primary' icon={<PlusOutlined style={{ fontSize: 16 }} />} onClick={openAdd}>新增影厅</Button>}
      </div>

      {/* 未选影院 - 显示影院选择卡片 */}
      {!selectedCinemaId && (
        <div className={styles.selectCinemaBox}>
          <div className={styles.selectCinemaIcon}>
            <EnvironmentOutlined style={{ fontSize: 32, color: '#1677ff' }} />
          </div>
          <Typography.Title level={5} className={styles.selectCinemaTitle}>请选择影院</Typography.Title>
          <Typography.Text type='secondary' className={styles.selectCinemaHint}>选择对应影院后管理影厅</Typography.Text>
          {/* 影院卡片网格 */}
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

      {/* 已选影院：展示影厅列表 ProTable */}
      {selectedCinemaId && (
        <ProTable<HallItem>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            // 查询指定影院的影厅列表
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
          pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50], showSizeChanger: true }}
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
