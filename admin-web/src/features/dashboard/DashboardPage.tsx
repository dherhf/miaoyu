import { useEffect } from 'react';
import { Row, Col, Button, Typography } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
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
  TrophyOutlined,
  EnvironmentOutlined,
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
import type { MovieRankItem, CinemaRow } from './store';
import { StatCard } from './StatCard';
import { ChartCard } from './ChartCard';
import styles from './DashboardPage.module.css';

/**
 * 数据看板页面组件
 *
 * 页面结构：
 * 1. 头部标题栏（标题 + 刷新按钮 + 更新时间）
 * 2. 统计卡片栅格（8 个核心指标：订单数、交易额、出票量、退票量、转化率、客单价、待支付、超时率）
 * 3. 趋势折线图（近7天订单量 & 交易额双 Y 轴折线图）
 * 4. 影片票房排行 TOP 10（ProTable）
 * 5. 影院运营分析（ProTable：票房、票数、订单、退票率、票房占比）
 *
 * 挂载时自动拉取数据，支持手动刷新
 */
export function DashboardPage() {
  const {
    stats,
    yesterdayCompare,
    trendData,
    movieRanking,
    cinemaStats,
    loading,
    refreshDashboard,
  } = useDashboardStore();

  // 页面挂载时自动拉取看板数据
  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  // 影片排行表格列配置
  const movieColumns: ProColumns<MovieRankItem>[] = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      // 前3名特殊样式
      render: (_, record) => (
        <div className={`${styles.rankBadge} ${record.rank <= 3 ? styles.rankBadgeTop : styles.rankBadgeNormal}`}>
          {record.rank}
        </div>
      ),
    },
    { title: '影片', dataIndex: 'movieName', ellipsis: true },
    // 票房格式化（千分位）
    { title: '票房(¥)', dataIndex: 'boxOffice', width: 110, align: 'right' as const, render: (_, record) => record.boxOffice?.toLocaleString() },
    { title: '票数', dataIndex: 'ticketCount', width: 80, align: 'right' as const },
    { title: '订单数', dataIndex: 'orderCount', width: 80, align: 'right' as const },
  ];

  // 影院分析表格列配置
  const cinemaColumns: ProColumns<CinemaRow>[] = [
    { title: '影院', dataIndex: 'cinemaName', ellipsis: true },
    { title: '票房(¥)', dataIndex: 'boxOffice', width: 110, align: 'right' as const, render: (_, record) => record.boxOffice?.toLocaleString() },
    { title: '票数', dataIndex: 'ticketCount', width: 70, align: 'right' as const },
    { title: '订单', dataIndex: 'orderCount', width: 70, align: 'right' as const },
    // 退票率格式化为百分比
    { title: '退票率', dataIndex: 'refundRate', width: 80, align: 'right' as const, render: (_, record) => `${(record.refundRate * 100).toFixed(1)}%` },
    // 票房占比格式化为百分比
    { title: '票房占比', dataIndex: 'boxOfficeShare', width: 90, align: 'right' as const, render: (_, record) => `${(record.boxOfficeShare * 100).toFixed(1)}%` },
  ];

  return (
    <div className={styles.page}>
      {/* 头部标题栏 */}
      <div className={styles.pageHeader}>
        <div>
          <Typography.Title level={3} className={styles.pageTitle}>数据看板</Typography.Title>
          <p className={styles.pageSubtitle}>实时监控运营数据，洞察业务趋势</p>
        </div>
        <div className={styles.headerRight}>
          {/* 数据更新时间 */}
          <span className={styles.updateTime}>数据更新：{new Date().toLocaleString('zh-CN')}</span>
          {/* 手动刷新按钮 */}
          <Button onClick={() => void refreshDashboard()} loading={loading}>刷新数据</Button>
        </div>
      </div>

      {/* 统计卡片栅格：8 个核心指标 */}
      <Row gutter={16} className={styles.statsRow}>
        {/* 今日订单总数 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日订单总数" value={stats.todayOrders} change={yesterdayCompare ? Math.abs(yesterdayCompare.orderCountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.orderCountChange >= 0 ? 'up' : 'down') : 'up'} icon={ShoppingCartOutlined} color="blue" />
        </Col>
        {/* 今日交易额 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日交易额" value={stats.todayRevenue} unit="¥" change={yesterdayCompare ? Math.abs(yesterdayCompare.transactionAmountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.transactionAmountChange >= 0 ? 'up' : 'down') : 'up'} icon={DollarOutlined} color="green" />
        </Col>
        {/* 今日出票量 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日出票量" value={stats.todayTickets} change={yesterdayCompare ? Math.abs(yesterdayCompare.ticketCountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.ticketCountChange >= 0 ? 'up' : 'down') : 'up'} icon={BarcodeOutlined} color="purple" />
        </Col>
        {/* 今日退票量 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="今日退票量" value={stats.todayRefunds} change={yesterdayCompare ? Math.abs(yesterdayCompare.refundCountChange) : undefined} changeType={yesterdayCompare ? (yesterdayCompare.refundCountChange >= 0 ? 'up' : 'down') : 'up'} icon={RollbackOutlined} color="red" />
        </Col>
        {/* 订单转化率 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="订单转化率" value={stats.conversionRate} unit="%" icon={AimOutlined} color="orange" />
        </Col>
        {/* 平均客单价 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="平均客单价" value={stats.avgOrderValue} unit="¥" icon={MoneyCollectOutlined} color="cyan" />
        </Col>
        {/* 待支付订单 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="待支付订单" value={stats.pendingOrders} icon={ClockCircleOutlined} color="pink" />
        </Col>
        {/* 超时取消率 */}
        <Col xs={12} sm={6} xl={6}>
          <StatCard title="超时取消率" value={stats.timeoutRate} unit="%" icon={ExclamationCircleOutlined} color="indigo" />
        </Col>
      </Row>

      {/* 趋势折线图：近7天订单量 & 交易额双 Y 轴 */}
      <ChartCard title="近7天订单量&交易额趋势" icon={BarChartOutlined}>
        <div className={styles.trendChart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              {/* 网格线 */}
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              {/* X 轴：日期 */}
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              {/* 左 Y 轴：订单量 */}
              <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              {/* 右 Y 轴：交易额（单位千元） */}
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={v => `¥${v / 1000}k`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Legend />
              {/* 订单量折线（蓝色，左 Y 轴） */}
              <Line yAxisId="left" type="monotone" dataKey="orders" name="订单量" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
              {/* 交易额折线（绿色，右 Y 轴） */}
              <Line yAxisId="right" type="monotone" dataKey="revenue" name="交易额" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 影片排行 & 影院分析 双栏 */}
      <Row gutter={16} className={styles.bottomRow}>
        {/* 影片票房排行 TOP 10 */}
        <Col xs={24} lg={12}>
          <ChartCard title="影片票房排行 TOP 10" icon={TrophyOutlined}>
            <ProTable<MovieRankItem>
              rowKey="rank"
              columns={movieColumns}
              dataSource={movieRanking}
              pagination={false}
              size="small"
              loading={loading}
              search={false}
              options={false}
              locale={{ emptyText: '暂无数据' }}
            />
          </ChartCard>
        </Col>
        {/* 影院运营分析 */}
        <Col xs={24} lg={12}>
          <ChartCard title="影院运营分析" icon={EnvironmentOutlined}>
            <ProTable<CinemaRow>
              rowKey="cinemaName"
              columns={cinemaColumns}
              dataSource={cinemaStats}
              pagination={false}
              size="small"
              loading={loading}
              search={false}
              options={false}
              locale={{ emptyText: '暂无数据' }}
            />
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
