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
import { useOrderStore, type OrderItem, type OrderStatus } from '../../stores';

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

  const fieldStyle: React.CSSProperties = { marginBottom: 0 };

  return (
    <Modal
      title="订单详情"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={640}
    >
      {/* 订单状态标题 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Tag color={statusCfg.color} style={{ fontSize: 16, padding: '4px 20px' }}>
          {statusCfg.label}
        </Tag>
        {order.status === 'paid' && order.pickupCode && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">取票码</Typography.Text>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 6, fontFamily: 'monospace', color: '#1677ff', marginTop: 4 }}>
              {order.pickupCode}
            </div>
            <div style={{ marginTop: 8, padding: '4px 0', background: '#f5f5f5', borderRadius: 6 }}>
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
          <Typography.Text strong style={{ color: '#f5222d', fontSize: 16 }}>
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
          <Divider orientation="left" style={{ fontSize: 14 }}>座位明细</Divider>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
        <Button type="link" size="small" onClick={() => openDetail(record)} style={{ padding: 0 }}>
          <Typography.Text code style={{ fontSize: 12 }}>{text}</Typography.Text>
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
        <div style={{ fontSize: 13 }}>
          <div>{row.showDate}</div>
          <div style={{ color: '#666' }}>{row.startTime}</div>
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
        <Typography.Text style={{ fontSize: 12 }}>{text}</Typography.Text>
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
        <Typography.Text strong style={{ color: '#f5222d' }}>
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
        <Typography.Text style={{ fontSize: 12 }}>{text}</Typography.Text>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      width: 170,
      render: (text?: string) => (
        <Typography.Text style={{ fontSize: 12, color: text ? undefined : '#ccc' }}>
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
        <Typography.Text style={{ fontSize: 12, color: text ? undefined : '#ccc' }}>
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
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 0 }}>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>订单明细</h2>
          <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            查看所有用户订单，支持多维度筛选与详情查看
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Space size={12} wrap align="center">
          <Input
            placeholder="订单号精确搜索"
            allowClear
            value={orderNo}
            onChange={(e) => handleFilterChange(setOrderNo, e.target.value)}
            style={{ width: 200 }}
            prefix={<Search size={14} color="#999" />}
          />
          <Input
            placeholder="影片名称模糊搜索"
            allowClear
            value={movieName}
            onChange={(e) => handleFilterChange(setMovieName, e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="影院名称模糊搜索"
            allowClear
            value={cinemaName}
            onChange={(e) => handleFilterChange(setCinemaName, e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="全部状态"
            allowClear
            value={statusFilter}
            onChange={(v) => handleFilterChange(setStatusFilter, v)}
            style={{ width: 120 }}
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
          <span style={{ color: '#999' }}>至</span>
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
            <div style={{ padding: 40 }}>
              <Receipt size={48} color="#ccc" />
              <div style={{ marginTop: 12, color: '#999' }}>暂无订单数据</div>
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
