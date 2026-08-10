import React, { useState, useRef } from 'react';
import {
  EyeOutlined,
  FileTextOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Input,
  Button,
  Tag,
  Descriptions,
  Typography,
  Divider,
  Spin,
} from 'antd';
import { message } from "@/shared/utils/globalMessage";
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { useOrderStore, type OrderItem, type OrderStatus } from './store';
import styles from './OrderPage.module.css';

// ===================== 常量 =====================
const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已出票', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
  refunded: { label: '已退票', color: 'red' },
  checked: { label: '已检票', color: 'blue' },
  expired: { label: '已过期', color: 'default' },
};

// ===================== 订单详情弹窗 =====================
interface OrderDetailModalProps {
  open: boolean;
  order: OrderItem | null;
  loading: boolean;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ open, order, loading, onClose }) => {
  return (
    <Modal
      title="订单详情"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={640}
    >
      <Spin spinning={loading}>
        {order ? (
          <OrderDetailContent order={order} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>加载中...</div>
        )}
      </Spin>
    </Modal>
  );
};

const OrderDetailContent: React.FC<{ order: OrderItem }> = ({ order }) => {
  const statusCfg = ORDER_STATUS_MAP[order.status] ?? { label: order.status, color: 'default' };

  return (
    <>
      <div className={styles.statusTitleContainer}>
        <Tag color={statusCfg.color} className={styles.statusTag}>
          {statusCfg.label}
        </Tag>
      </div>

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="订单编号" span={2}>
          <Typography.Text>{order.orderNo}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="用户手机号">{order.userPhone}</Descriptions.Item>
        <Descriptions.Item label="票数">{order.ticketCount} 张</Descriptions.Item>
        <Descriptions.Item label="影片名称" span={2}>{order.movieName}</Descriptions.Item>
        <Descriptions.Item label="影院名称">{order.cinemaName}</Descriptions.Item>
        <Descriptions.Item label="影厅">{order.hallName}</Descriptions.Item>
        <Descriptions.Item label="放映日期">{order.showDate}</Descriptions.Item>
        <Descriptions.Item label="放映时间">{order.startTime}</Descriptions.Item>
        <Descriptions.Item label="座位信息" span={2}>{order.seatInfo || '--'}</Descriptions.Item>
        <Descriptions.Item label="订单金额">
          <Typography.Text strong className={styles.amountText}>
            ¥{(order.totalAmount ?? 0).toFixed(2)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="下单时间">{order.createdAt}</Descriptions.Item>
        {order.paidAt && (
          <Descriptions.Item label="支付时间" span={2}>{order.paidAt}</Descriptions.Item>
        )}
        {order.cancelledAt && (
          <Descriptions.Item label="取消时间" span={2}>{order.cancelledAt}</Descriptions.Item>
        )}
        {order.status === 'checked' && order.checkedAt && (
          <Descriptions.Item label="检票时间" span={2}>{order.checkedAt}</Descriptions.Item>
        )}
        {order.cancelReason && (
          <Descriptions.Item label="取消原因" span={2}>
            <Typography.Text type="secondary">{order.cancelReason}</Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {order.seats && order.seats.length > 0 && (
        <>
          <Divider titlePlacement="left" className={styles.sectionDivider}>座位明细</Divider>
          <div className={styles.seatsContainer}>
            {order.seats.map((seat, idx) => (
              <Tag key={idx} color={seat.status === 'sold' || seat.status === 'paid' ? 'blue' : 'default'}>
                {seat.seatLabel}
              </Tag>
            ))}
          </div>
        </>
      )}
    </>
  );
};

// ===================== 检票弹窗 =====================
interface CheckTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckTicketModal: React.FC<CheckTicketModalProps> = ({ open, onClose, onSuccess }) => {
  const { checkTicket } = useOrderStore();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderItem | null>(null);

  const handleSubmit = async () => {
    if (code.length !== 6) {
      message.warning('请输入6位取票码');
      return;
    }
    setSubmitting(true);
    try {
      const detail = await checkTicket(code.toUpperCase());
      if (detail) {
        setResult(detail);
        message.success('检票成功');
      }
    } catch {
      // axios 拦截器已处理错误提示
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setResult(null);
    onClose();
    if (result) {
      onSuccess();
    }
  };

  return (
    <Modal
      title="检票"
      open={open}
      onCancel={handleClose}
      footer={
        result ? (
          <Button type="primary" onClick={handleClose}>完成</Button>
        ) : (
          <Button onClick={handleClose}>取消</Button>
        )
      }
      width={480}
    >
      {result ? (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="订单编号" span={2}>{result.orderNo}</Descriptions.Item>
          <Descriptions.Item label="影片名称" span={2}>{result.movieName}</Descriptions.Item>
          <Descriptions.Item label="影院名称">{result.cinemaName}</Descriptions.Item>
          <Descriptions.Item label="影厅">{result.hallName}</Descriptions.Item>
          <Descriptions.Item label="放映日期">{result.showDate}</Descriptions.Item>
          <Descriptions.Item label="放映时间">{result.startTime}</Descriptions.Item>
          <Descriptions.Item label="座位" span={2}>{result.seatInfo}</Descriptions.Item>
          <Descriptions.Item label="状态" span={2}>
            <Tag color="blue">已检票</Tag>
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          <Typography.Text type="secondary">请输入用户出示的6位取票码</Typography.Text>
          <Input
            size="large"
            placeholder="请输入取票码"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onPressEnter={handleSubmit}
            style={{ marginTop: 12, letterSpacing: 4, textAlign: 'center', fontFamily: 'monospace' }}
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              确认检票
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ===================== 主页面 =====================
const OrderManage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { fetchOrders, fetchOrderDetail } = useOrderStore();

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 检票弹窗状态
  const [checkTicketOpen, setCheckTicketOpen] = useState(false);

  // 查看详情
  const openDetail = async (order: OrderItem) => {
    setDetailOpen(true);
    setDetailOrder(null);
    setDetailLoading(true);
    try {
      const detail = await fetchOrderDetail(order.id);
      setDetailOrder(detail ?? order);
    } catch {
      setDetailOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  // 表格列配置
  const columns: ProColumns<OrderItem>[] = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      width: 200,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)} className={styles.orderNoButton}>
          <span className={styles.cellText}>{record.orderNo}</span>
        </Button>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userPhone',
      width: 130,
      align: 'center',
    },
    {
      title: '影片名称',
      dataIndex: 'movieName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '影院名称',
      dataIndex: 'cinemaName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '场次时间',
      key: 'showTime',
      width: 160,
      search: false,
      render: (_, record) => (
        <div className={styles.showTimeCell}>
          <div>{record.showDate}</div>
          <div className={styles.showTimeSub}>{record.startTime}</div>
        </div>
      ),
    },
    {
      title: '影厅',
      dataIndex: 'hallName',
      width: 120,
      align: 'center',
      search: false,
    },
    {
      title: '座位',
      dataIndex: 'seatInfo',
      width: 160,
      ellipsis: true,
      search: false,
      render: (_, record) => (
        <Typography.Text className={styles.cellText}>{record.seatInfo || '--'}</Typography.Text>
      ),
    },
    {
      title: '票数',
      dataIndex: 'ticketCount',
      width: 70,
      align: 'center',
      search: false,
      render: (_, record) => `${record.ticketCount} 张`,
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 100,
      align: 'right',
      search: false,
      render: (_, record) => (
        <Typography.Text strong className={styles.amountCellText}>
          ¥{(record.totalAmount ?? 0).toFixed(2)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(ORDER_STATUS_MAP).map(([k, v]) => [k, { text: v.label }]),
      ),
      render: (_, record) => {
        const cfg = ORDER_STATUS_MAP[record.status] ?? { label: record.status, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 170,
      search: false,
      render: (_, record) => (
        <Typography.Text className={styles.cellText}>{record.createdAt || '--'}</Typography.Text>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      width: 170,
      search: false,
      render: (_, record) => (
        <Typography.Text className={styles.cellText} style={{ color: record.paidAt ? undefined : '#ccc' }}>
          {record.paidAt || '--'}
        </Typography.Text>
      ),
    },
    {
      title: '取消原因',
      dataIndex: 'cancelReason',
      width: 150,
      ellipsis: true,
      search: false,
      render: (_, record) => (
        <Typography.Text className={styles.cellText} style={{ color: record.cancelReason ? undefined : '#ccc' }}>
          {record.cancelReason || '--'}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      search: false,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>订单明细</h2>
          <p className={styles.pageSubtitle}>
            查看所有用户订单，支持多维度筛选与详情查看
          </p>
        </div>
        <Button
          type="primary"
          icon={<SafetyOutlined />}
          onClick={() => setCheckTicketOpen(true)}
        >
          检票
        </Button>
      </div>

      {/* ProTable */}
      <ProTable<OrderItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          await fetchOrders({
            orderNo: params.orderNo || undefined,
            movieName: params.movieName || undefined,
            cinemaName: params.cinemaName || undefined,
            status: params.status || undefined,
            dateFrom: params.dateFrom ? dayjs(params.dateFrom as string).format('YYYY-MM-DD') : undefined,
            dateTo: params.dateTo ? dayjs(params.dateTo as string).format('YYYY-MM-DD') : undefined,
            page: params.current ?? 1,
            size: params.pageSize ?? 20,
          });
          const state = useOrderStore.getState();
          return {
            data: state.orders,
            success: true,
            total: state.total,
          };
        }}
        search={{ labelWidth: 'auto', span: 4, defaultCollapsed: false }}
        pagination={{
          defaultPageSize: 20,
          pageSizeOptions: [10, 20, 50],
          showSizeChanger: true,
        }}
        bordered
        scroll={{ x: 'max-content' }}
        headerTitle="订单明细"
        locale={{
          emptyText: (
            <div className={styles.emptyState}>
              <FileTextOutlined style={{ fontSize: 48, color: '#ccc' }} />
              <div className={styles.emptyText}>暂无订单数据</div>
            </div>
          ),
        }}
      />

      {/* 详情弹窗 */}
      <OrderDetailModal
        open={detailOpen}
        order={detailOrder}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
      />

      {/* 检票弹窗 */}
      <CheckTicketModal
        open={checkTicketOpen}
        onClose={() => setCheckTicketOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />
    </div>
  );
};

export default OrderManage;
