import React from 'react';
import { Row, Col, Button, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Ticket,
  RotateCcw,
  Target,
  Coins,
  Clock,
  AlertCircle,
  BarChart3,
  Film,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useDashboardStore } from '../../stores';

// ====================== TS 类型定义 ======================
interface StatItem {
  title: string;
  value: number;
  unit?: '' | '¥' | '%';
  change?: number;
  changeType?: 'up' | 'down';
  icon: React.FC<{ className?: string }>;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'pink' | 'indigo';
}

interface TrendRecord {
  date: string;
  orders: number;
  revenue: number;
}

interface MovieRankItem {
  rank: number;
  name: string;
  type: string;
  boxOffice: number;
  occupancy: number;
}

interface CinemaDistItem {
  name: string;
  value: number;
  count: number;
}

interface CinemaRow {
  name: string;
  branch: string;
  dailyRevenue: number;
  occupancy: number;
}

// 色彩映射常量
const colorMap = {
  blue: { bg: '#eff6ff', text: '#2563eb' },
  green: { bg: '#f0fdf4', text: '#16a34a' },
  orange: { bg: '#fff7ed', text: '#ea580c' },
  red: { bg: '#fef2f2', text: '#dc2626' },
  purple: { bg: '#faf5ff', text: '#9333ea' },
  cyan: { bg: '#ecfeff', text: '#0891b2' },
  pink: { bg: '#fdf2f8', text: '#db2777' },
  indigo: { bg: '#eef2ff', text: '#4f46e5' },
};
const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// ====================== 统计卡片组件 ======================
const StatCard: React.FC<StatItem> = ({ title, value, unit = '', change, changeType = 'up', icon: Icon, color }) => {
  const styleConfig = colorMap[color];
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 8, marginBottom: 0 }}>
            {unit === '¥' && <span style={{ fontSize: 16, fontWeight: 500 }}>¥</span>}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit === '%' && <span style={{ fontSize: 16 }}>%</span>}
          </p>
          {change !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 14, color: changeType === 'up' ? '#16a34a' : '#dc2626' }}>
              {changeType === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>{change}%</span>
              <span style={{ color: '#9ca3af', marginLeft: 4 }}>较昨日</span>
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: styleConfig.bg, color: styleConfig.text }}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

// ====================== 图表外层卡片 ======================
interface ChartCardProps {
  title: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
}
const ChartCard: React.FC<ChartCardProps> = ({ title, icon: Icon, children }) => {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={20} color="#6b7280" />
        <Typography.Title level={5} style={{ margin: 0, fontWeight: 600 }}>{title}</Typography.Title>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
};

// ====================== 主看板页面 ======================
const Dashboard: React.FC = () => {
  const {
    stats,
    trendData,
    movieRanking,
    cinemaStats,
    cinemaTypeDistribution,
    refreshDashboard,
  } = useDashboardStore();

  // 影片排行表格列
  const movieColumns: TableProps<MovieRankItem>['columns'] = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 70,
      render: (rank) => (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          background: rank <= 3 ? '#1677ff' : '#f3f4f6',
          color: rank <= 3 ? '#fff' : '#4b5563',
        }}>
          {rank}
        </div>
      ),
    },
    { title: '影片', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type' },
    { title: '票房(万)', dataIndex: 'boxOffice', align: 'right' },
    {
      title: '上座率',
      dataIndex: 'occupancy',
      align: 'right',
      render: (val) => (
        <span style={{
          fontSize: 12, padding: '2px 8', borderRadius: 6,
          background: val >= 85 ? '#f0fdf4' : val >=75 ? '#eff6ff' : '#f3f4f6',
          color: val >=85 ? '#16a34a' : val >=75 ? '#2563eb' : '#4b5563'
        }}>
          {val}%
        </span>
      ),
    },
  ];

  // 影院运营表格列
  const cinemaColumns: TableProps<CinemaRow>['columns'] = [
    { title: '影院名称', dataIndex: 'name' },
    { title: '分店', dataIndex: 'branch' },
    { title: '日营收(万)', dataIndex: 'dailyRevenue', align: 'right', render: val => `¥${(val / 10000).toFixed(1)}` },
    {
      title: '上座率',
      dataIndex: 'occupancy',
      align: 'right',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <div style={{ width: 64, height: 6, background: '#f3f4f6', borderRadius: 99 }}>
            <div style={{ width: `${val}%`, height: '100%', background: '#1677ff', borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{val}%</span>
        </div>
      ),
    },
  ];

  return (
    // 重点：页面根容器无白色背景，只保留内边距，外层浅灰由AdminLayout提供
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 0 }}>
      {/* 头部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>数据看板</Typography.Title>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>实时监控运营数据，洞察业务趋势</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>数据更新：{new Date().toLocaleString('zh-CN')}</span>
          <Button onClick={refreshDashboard}>刷新数据</Button>
        </div>
      </div>

      {/* 统计卡片栅格 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日订单总数" value={stats.todayOrders} change={12.5} changeType="up" icon={ShoppingCart} color="blue" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日交易额" value={stats.todayRevenue} unit="¥" change={8.3} changeType="up" icon={DollarSign} color="green" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日出票量" value={stats.todayTickets} change={5.2} changeType="up" icon={Ticket} color="purple" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日退票量" value={stats.todayRefunds} change={2.1} changeType="down" icon={RotateCcw} color="red" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="订单转化率" value={stats.conversionRate} unit="%" change={1.5} changeType="up" icon={Target} color="orange" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="平均客单价" value={stats.avgOrderValue} unit="¥" change={3.2} changeType="up" icon={Coins} color="cyan" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="待支付订单" value={stats.pendingOrders} icon={Clock} color="pink" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="超时取消率" value={stats.timeoutRate} unit="%" change={0.5} changeType="down" icon={AlertCircle} color="indigo" />
        </Col>
      </Row>

      {/* 趋势图 */}
      <ChartCard title="近7天订单量&交易额趋势" icon={BarChart3}>
        <div style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={v => `¥${v / 1000}k`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="orders" name="订单量" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="交易额" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 影片+影院双栏 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="影片热度前十" icon={Film}>
            <div style={{ height: 160, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movieRanking.slice(0,5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                  <Bar dataKey="boxOffice" name="票房(万)" fill="#3b82f6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table<MovieRankItem>
              rowKey="rank"
              columns={movieColumns}
              dataSource={movieRanking}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <ChartCard title="影院运营分析" icon={Building2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 200, height: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cinemaTypeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {cinemaTypeDistribution.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => [`${val}家 (${props.payload.count}厅)`, name]} contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <Table<CinemaRow>
                    rowKey="name"
                    columns={cinemaColumns}
                    dataSource={cinemaStats.slice(0,5)}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                {cinemaTypeDistribution.map((item, idx) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: pieColors[idx % pieColors.length] }} />
                    <span>{item.name}</span>
                    <span>({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;