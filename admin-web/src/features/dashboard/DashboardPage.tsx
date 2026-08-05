import { useEffect } from 'react';
import { Row, Col, Button, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  BarcodeOutlined,
  RollbackOutlined,
  AimOutlined,
  MoneyCollectOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardStore } from './store';
import { StatCard } from './StatCard';
import { ChartCard } from './ChartCard';
import styles from './DashboardPage.module.css';


export function DashboardPage() {
  const {
    stats,
    yesterdayCompare,
    trendData,
    loading,
    refreshDashboard,
  } = useDashboardStore();

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  // 影片排行表格列


  return (
    <div className={styles.page}>
      {/* 头部标题栏 */}
      <div className={styles.pageHeader}>
        <div>
          <Typography.Title level={3} className={styles.pageTitle}>数据看板</Typography.Title>
          <p className={styles.pageSubtitle}>实时监控运营数据，洞察业务趋势</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.updateTime}>数据更新：{new Date().toLocaleString('zh-CN')}</span>
          <Button onClick={() => void refreshDashboard()} loading={loading}>刷新数据</Button>
        </div>
      </div>

      {/* 统计卡片栅格 */}
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日订单总数" value={stats.todayOrders} change={yesterdayCompare ? Math.abs(yesterdayCompare.orderCountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.orderCountChange >= 0 ? 'up' : 'down') : 'up'} icon={ShoppingCartOutlined} color="blue" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日交易额" value={stats.todayRevenue} unit="¥" change={yesterdayCompare ? Math.abs(yesterdayCompare.transactionAmountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.transactionAmountChange >= 0 ? 'up' : 'down') : 'up'} icon={DollarOutlined} color="green" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日出票量" value={stats.todayTickets} change={yesterdayCompare ? Math.abs(yesterdayCompare.ticketCountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.ticketCountChange >= 0 ? 'up' : 'down') : 'up'} icon={BarcodeOutlined} color="purple" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日退票量" value={stats.todayRefunds} icon={RollbackOutlined} color="red" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="订单转化率" value={stats.conversionRate} unit="%" icon={AimOutlined} color="orange" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="平均客单价" value={stats.avgOrderValue} unit="¥" icon={MoneyCollectOutlined} color="cyan" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="待支付订单" value={stats.pendingOrders} icon={ClockCircleOutlined} color="pink" />
        </Col>
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="超时取消率" value={stats.timeoutRate} unit="%" icon={ExclamationCircleOutlined} color="indigo" />
        </Col>
      </Row>

      {/* 趋势图 */}
      <ChartCard title="近7天订单量&交易额趋势" icon={BarChartOutlined}>
        <div className={styles.trendChart}>
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

    </div>
  );
}
