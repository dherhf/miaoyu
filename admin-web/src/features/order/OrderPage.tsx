import React, { useState, useRef } from 'react';
import {
  Eye,
  Receipt,
  TicketCheck,
} from 'lucide-react';
import {
  Modal,
  Input,
  Button,
  Tag,
  Descriptions,
  Typography,
  Divider,
  Spin,
  message,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { useOrderStore, type OrderItem, type OrderStatus } from './store';
import styles from './OrderPage.module.css';

// ===================== 常量 =====================

/**
 * 订单状态标签配置
 * 映射订单状态到显示文案和颜色
 */
const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已出票', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
  refunded: { label: '已退票', color: 'red' },
  checked: { label: '已检票', color: 'blue' },
  expired: { label: '已过期', color: 'default' },
};

// ===================== 订单详情弹窗 =====================

/** 订单详情弹窗属性 */
interface OrderDetailModalProps {
  /** 是否打开 */
  open: boolean;
  /** 订单数据 */
  order: OrderItem | null;
  /** 加载中状态 */
  loading: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 订单详情弹窗组件
 * 展示订单的完整信息：状态、订单编号、用户信息、影片/影院/座位、金额、时间等
 */
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

/**
 * 订单详情内容组件
 * 使用 antd Descriptions 组件展示订单的详细信息
 */
const OrderDetailContent: React.FC<{ order: OrderItem }> = ({ order }) => {
  // 获取订单状态配置
  const statusCfg = ORDER_STATUS_MAP[order.status];

  return (
    <>
      {/* 订单状态标签 */}
      <div className={styles.statusTitleContainer}>
        <Tag color={statusCfg.color} className={styles.statusTag}>
          {statusCfg.label}
        </Tag>
      </div>

      {/* 订单基本信息 */}
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
            ¥{order.totalAmount.toFixed(2)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="下单时间">{order.createdAt}</Descriptions.Item>
        {/* 已支付：显示支付时间 */}
        {order.paidAt && (
          <Descriptions.Item label="支付时间" span={2}>{order.paidAt}</Descriptions.Item>
        )}
        {/* 已取消：显示取消时间 */}
        {order.cancelledAt && (
          <Descriptions.Item label="取消时间" span={2}>{order.cancelledAt}</Descriptions.Item>
        )}
        {/* 已检票：显示检票时间 */}
        {order.status === 'checked' && order.checkedAt && (
          <Descriptions.Item label="检票时间" span={2}>{order.checkedAt}</Descriptions.Item>
        )}
        {/* 有取消原因时显示 */}
        {order.cancelReason && (
          <Descriptions.Item label="取消原因" span={2}>
            <Typography.Text type="secondary">{order.cancelReason}</Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 座位明细列表 */}
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

/** 检票弹窗属性 */
interface CheckTicketModalProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 检票成功后的回调（通常刷新列表） */
  onSuccess: () => void;
}

/**
 * 检票弹窗组件
 * 管理员通过输入用户出示的6位取票码进行检票。
 * - 输入取票码后点击确认检票
 * - 检票成功后展示订单详情
 * - 关闭弹窗时如果有检票结果，触发 onSuccess 回调刷新列表
 */
const CheckTicketModal: React.FC<CheckTicketModalProps> = ({ open, onClose, onSuccess }) => {
  const { checkTicket } = useOrderStore();
  // 取票码输入值
  const [code, setCode] = useState('');
  // 提交中状态
  const [submitting, setSubmitting] = useState(false);
  // 检票结果（检票成功后展示）
  const [result, setResult] = useState<OrderItem | null>(null);

  /**
   * 确认检票
   * 1. 校验收票码长度（必须6位）
   * 2. 调用 checkTicket 接口
   * 3. 成功后展示订单详情
   */
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

  /**
   * 关闭弹窗处理
   * 清空输入和结果，如果有检票结果则触发 onSuccess
   */
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
          // 有检票结果：显示"完成"按钮
          <Button type="primary" onClick={handleClose}>完成</Button>
        ) : (
          // 无检票结果：显示"取消"按钮
          <Button onClick={handleClose}>取消</Button>
        )
      }
      width={480}
    >
      {result ? (
        // 检票成功：展示订单详情
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
        // 待检票：取票码输入
        <div style={{ paddingBottom: 8 }}>
          <Typography.Text type="secondary">请输入用户出示的6位取票码</Typography.Text>
          <Input
            size="large"
            placeholder="请输入取票码"
            maxLength={6}
            value={code}
            // 转大写并过滤非字母数字
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

/**
 * 订单管理页面组件
 *
 * 功能：
 * 1. 订单列表展示（ProTable，支持按订单号、影片名、影院名、状态搜索）
 * 2. 查看订单详情（弹窗展示完整信息）
 * 3. 检票功能（通过取票码检票）
 * 4. 支持日期范围筛选
 * 5. 多维度信息展示：订单号、用户、影片、影院、影厅、场次、座位、金额、状态、时间等
 */
const OrderManage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { fetchOrders, fetchOrderDetail } = useOrderStore();

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 检票弹窗状态
  const [checkTicketOpen, setCheckTicketOpen] = useState(false);

  /**
   * 查看订单详情
   * 打开详情弹窗并拉取订单详情数据
   */
  const openDetail = async (order: OrderItem) => {
    setDetailOpen(true);
    setDetailOrder(null);
    setDetailLoading(true);
    try {
      const detail = await fetchOrderDetail(order.id);
      setDetailOrder(detail ?? order);
    } catch {
      // 拉取失败时使用列表数据
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
      // 点击订单号查看详情
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
      // 展示日期 + 时间
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
      // 金额加粗显示
      render: (_, record) => (
        <Typography.Text strong className={styles.amountCellText}>
          ¥{record.totalAmount.toFixed(2)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      valueType: 'select',
      // 状态筛选下拉
      valueEnum: Object.fromEntries(
        Object.entries(ORDER_STATUS_MAP).map(([k, v]) => [k, { text: v.label }]),
      ),
      // 状态标签渲染
      render: (_, record) => {
        const cfg = ORDER_STATUS_MAP[record.status];
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
      // 未支付显示灰色
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
      // 无取消原因显示灰色
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
      // 详情按钮
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
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
        {/* 检票按钮 */}
        <Button
          type="primary"
          icon={<TicketCheck size={16} />}
          onClick={() => setCheckTicketOpen(true)}
        >
          检票
        </Button>
      </div>

      {/* 订单列表 ProTable */}
      <ProTable<OrderItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          // 查询订单列表
          await fetchOrders({
            orderNo: params.orderNo || undefined,
            movieName: params.movieName || undefined,
            cinemaName: params.cinemaName || undefined,
            status: params.status || undefined,
            // 日期格式化
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
        // 自定义空状态
        locale={{
          emptyText: (
            <div className={styles.emptyState}>
              <Receipt size={48} color="#ccc" />
              <div className={styles.emptyText}>暂无订单数据</div>
            </div>
          ),
        }}
      />

      {/* 订单详情弹窗 */}
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
