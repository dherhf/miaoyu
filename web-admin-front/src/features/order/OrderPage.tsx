import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  Clock,
  Ticket,
  Receipt,
  QrCode,
} from 'lucide-react';
import {
  Table,
  Modal,
  Input,
  Button,
  Select,
  Space,
  Tag,
  DatePicker,
  Descriptions,
  Typography,
  Divider,
  Card,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useOrderStore, type OrderItem, type OrderStatus } from './store';
import styles from './OrderPage.module.css';

// ===================== 常量 =====================
const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已出票', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
  refunded: { label: '已退票', color: 'red' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ===================== 订单详情弹窗 =====================
interface OrderDetailModalProps {
  open: boolean;
  order: OrderItem | null;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ open, order, onClose }) => {
  if (!order) return null;

  const statusCfg = ORDER_STATUS_MAP[order.status];

  return (
    <Modal
      title="订单详情"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={640}
    >
      {/* 订单状态标题 */}
      <div className={styles.statusTitleContainer}>
        <Tag color={statusCfg.color} className={styles.statusTag}>
          {statusCfg.label}
        </Tag>
        {order.status === 'paid' && order.pickupCode && (
          <div className={styles.pickupCodeWrapper}>
            <Typography.Text type="secondary">取票码</Typography.Text>
            <div className={styles.pickupCode}>
              {order.pickupCode}
            </div>
            <div className={styles.qrCodeWrapper}>
              <QrCode size={80} color="#1677ff" />
            </div>
          </div>
        )}
      </div>

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="订单编号" span={2}>
          <Typography.Text code>{order.orderNo}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="用户手机号">{order.userPhone}</Descriptions.Item>
        <Descriptions.Item label="票数">{order.ticketCount} 张</Descriptions.Item>
        <Descriptions.Item label="影片名称" span={2}>{order.movieName}</Descriptions.Item>
        <Descriptions.Item label="影院名称">{order.cinemaName}</Descriptions.Item>
        <Descriptions.Item label="影厅">{order.hallName}</Descriptions.Item>
        {order.cinemaAddress && (
          <Descriptions.Item label="影院地址" span={2}>{order.cinemaAddress}</Descriptions.Item>
        )}
        <Descriptions.Item label="放映日期">{order.showDate}</Descriptions.Item>
        <Descriptions.Item label="放映时间">{order.startTime}</Descriptions.Item>
        <Descriptions.Item label="座位信息" span={2}>{order.seatInfo}</Descriptions.Item>
        <Descriptions.Item label="订单金额">
          <Typography.Text strong className={styles.amountText}>
            ¥{order.totalAmount.toFixed(2)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="下单时间">{order.createdAt}</Descriptions.Item>
        {order.paidAt && (
          <Descriptions.Item label="支付时间" span={2}>{order.paidAt}</Descriptions.Item>
        )}
        {order.cancelledAt && (
          <Descriptions.Item label="取消时间" span={2}>{order.cancelledAt}</Descriptions.Item>
        )}
        {order.cancelReason && (
          <Descriptions.Item label="取消原因" span={2}>
            <Typography.Text type="secondary">{order.cancelReason}</Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 座位明细 */}
      {order.seats && order.seats.length > 0 && (
        <>
          <Divider orientation="left" className={styles.sectionDivider}>座位明细</Divider>
          <div className={styles.seatsContainer}>
            {order.seats.map((seat, idx) => (
              <Tag key={idx} color={seat.status === 'sold' ? 'blue' : 'default'}>
                {seat.seatLabel}
              </Tag>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

// ===================== 主页面 =====================
const OrderManage: React.FC = () => {
  const { orders } = useOrderStore();

  // 筛选状态
  const [orderNo, setOrderNo] = useState('');
  const [movieName, setMovieName] = useState('');
  const [cinemaName, setCinemaName] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);

  // 筛选后的数据
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (orderNo.trim()) {
      list = list.filter((o) => o.orderNo.includes(orderNo.trim()));
    }
    if (movieName.trim()) {
      const kw = movieName.toLowerCase();
      list = list.filter((o) => o.movieName.toLowerCase().includes(kw));
    }
    if (cinemaName.trim()) {
      const kw = cinemaName.toLowerCase();
      list = list.filter((o) => o.cinemaName.toLowerCase().includes(kw));
    }
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (dateFrom) {
      list = list.filter((o) => o.showDate >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((o) => o.showDate <= dateTo);
    }

    // 按下单时间倒序
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [orders, orderNo, movieName, cinemaName, statusFilter, dateFrom, dateTo]);

  const total = filteredOrders.length;
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * pageSize, page * pageSize),
    [filteredOrders, page, pageSize],
  );

  // 筛选变更时重置页码
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  // 查看详情
  const openDetail = (order: OrderItem) => {
    setDetailOrder(order);
    setDetailOpen(true);
  };

  // 表格列配置
  const columns: TableProps<OrderItem>['columns'] = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      width: 200,
      render: (text: string, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)} className={styles.orderNoButton}>
          <Typography.Text code className={styles.cellText}>{text}</Typography.Text>
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
      render: (_v, row) => (
        <div className={styles.showTimeCell}>
          <div>{row.showDate}</div>
          <div className={styles.showTimeSub}>{row.startTime}</div>
        </div>
      ),
    },
    {
      title: '影厅',
      dataIndex: 'hallName',
      width: 120,
      align: 'center',
    },
    {
      title: '座位',
      dataIndex: 'seatInfo',
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        <Typography.Text className={styles.cellText}>{text}</Typography.Text>
      ),
    },
    {
      title: '票数',
      dataIndex: 'ticketCount',
      width: 70,
      align: 'center',
      render: (v: number) => `${v} 张`,
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <Typography.Text strong className={styles.amountCellText}>
          ¥{v.toFixed(2)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      align: 'center',
      render: (status: OrderStatus) => {
        const cfg = ORDER_STATUS_MAP[status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (text: string) => (
        <Typography.Text className={styles.cellText}>{text}</Typography.Text>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      width: 170,
      render: (text?: string) => (
        <Typography.Text className={styles.cellText} style={{ color: text ? undefined : '#ccc' }}>
          {text || '--'}
        </Typography.Text>
      ),
    },
    {
      title: '取消原因',
      dataIndex: 'cancelReason',
      width: 150,
      ellipsis: true,
      render: (text?: string) => (
        <Typography.Text className={styles.cellText} style={{ color: text ? undefined : '#ccc' }}>
          {text || '--'}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_v, record) => (
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
      </div>

      {/* 筛选栏 */}
      <div className={styles.filterBar}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="订单号精确搜索"
            allowClear
            value={orderNo}
            onChange={(e) => handleFilterChange(setOrderNo, e.target.value)}
            className={styles.filterInput}
            prefix={<Search size={14} color="#999" />}
          />
          <Input
            placeholder="影片名称模糊搜索"
            allowClear
            value={movieName}
            onChange={(e) => handleFilterChange(setMovieName, e.target.value)}
            className={styles.filterInput}
          />
          <Input
            placeholder="影院名称模糊搜索"
            allowClear
            value={cinemaName}
            onChange={(e) => handleFilterChange(setCinemaName, e.target.value)}
            className={styles.filterInput}
          />
          <Select
            placeholder="全部状态"
            allowClear
            value={statusFilter}
            onChange={(v) => handleFilterChange(setStatusFilter, v)}
            className={styles.statusSelect}
          >
            {Object.entries(ORDER_STATUS_MAP).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
          <DatePicker
            placeholder="起始日期"
            value={dateFrom ? dayjs(dateFrom) : undefined}
            onChange={(d) => handleFilterChange(setDateFrom, d?.format('YYYY-MM-DD') || '')}
          />
          <span className={styles.dateSeparator}>至</span>
          <DatePicker
            placeholder="结束日期"
            value={dateTo ? dayjs(dateTo) : undefined}
            onChange={(d) => handleFilterChange(setDateTo, d?.format('YYYY-MM-DD') || '')}
          />
          {(orderNo || movieName || cinemaName || statusFilter || dateFrom || dateTo) && (
            <Button
              onClick={() => {
                setOrderNo('');
                setMovieName('');
                setCinemaName('');
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            >
              重置
            </Button>
          )}
        </Space>
      </div>

      {/* 表格 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<OrderItem>
        rowKey="id"
        columns={columns}
        dataSource={paginatedOrders}
        bordered
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条订单`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        locale={{
          emptyText: (
            <div className={styles.emptyState}>
              <Receipt size={48} color="#ccc" />
              <div className={styles.emptyText}>暂无订单数据</div>
            </div>
          ),
        }}
      />
      </Card>

      {/* 详情弹窗 */}
      <OrderDetailModal
        open={detailOpen}
        order={detailOrder}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
};

export default OrderManage;
