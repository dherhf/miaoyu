import { useEffect, useState } from 'react'
import { Button, Table, Empty, Spin, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getScheduleList } from '../api'
import type { ScheduleListVO } from '../types'
import SeatMapModal from './SeatMapModal'

/** 每场次最多可选座位数 */
const MAX_SEATS = 6

/**
 * 排片场次表格组件。
 * 在影片详情页中展示该影片的所有排片场次，
 * 包括放映日期、时间、影院、影厅、版本、票价和可选座位数。
 * 点击场次行或"选座购票"按钮打开座位图弹窗。
 * @param movieId 影片ID
 */
export default function ScheduleTable({ movieId }: { movieId: string }) {
  // 排片场次列表
  const [schedules, setSchedules] = useState<ScheduleListVO[]>([])
  // 加载状态
  const [loading, setLoading] = useState(true)
  // 当前选中的场次（用于打开座位图弹窗）
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleListVO | null>(null)

  // 影片ID变化时重新加载排片场次
  useEffect(() => {
    setLoading(true)
    getScheduleList(movieId)
      .then((res) => setSchedules(res.records))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [movieId])

  // 表格列定义
  const columns: ColumnsType<ScheduleListVO> = [
    {
      title: '放映日期',
      dataIndex: 'showDate',
      key: 'showDate',
      width: 110,
    },
    {
      title: '放映时间',
      dataIndex: 'startTime',
      key: 'showTime',
      width: 90,
      // 显示开始时间和散场时间
      render: (v: string, record) => (
        <>
          <span>{v.slice(0, 5)}</span>
          <br />
          <span>{record.endTime?.slice(0, 5)}散场</span>
        </>
      ),
    },
    {
      title: '影院',
      dataIndex: 'cinemaName',
      key: 'cinemaName',
      ellipsis: true,
    },
    {
      title: '影厅',
      dataIndex: 'hallName',
      key: 'hallName',
      width: 100,
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'languageVersion',
      key: 'languageVersion',
      width: 80,
      render: (v: string) => v && <Tag color="purple">{v}</Tag>,
    },
    {
      title: '票价',
      dataIndex: 'price',
      key: 'price',
      width: 70,
      render: (v: number) => `¥${Number(v).toFixed(1)}`,
    },
    {
      title: '可选座',
      dataIndex: 'availableSeats',
      key: 'availableSeats',
      width: 70,
      // 根据剩余座位数显示不同颜色：已满灰色，少量红色警告，充足显示比例
      render: (v: number, record) => {
        if (v <= 0) return <span className="text-muted">已满</span>
        if (v <= MAX_SEATS) return <span className="text-danger">{v}</span>
        return <span className="text-muted">{v}/{record.totalSeats}</span>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, record) => (
        <Button
          type="primary"
          danger
          size="small"
          disabled={record.availableSeats <= 0}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedSchedule(record)
          }}
        >
          {record.availableSeats <= 0 ? '已售罄' : '选座购票'}
        </Button>
      ),
    },
  ]

  return (
    <div className="mt-6">
      <h2 className="text-lg mb-3">选座购票</h2>
      {loading ? (
        <div className="py-8 text-center"><Spin /></div>
      ) : schedules.length === 0 ? (
        <Empty description="暂无排片场次" className="py-8" />
      ) : (
        <Table<ScheduleListVO>
          columns={columns}
          dataSource={schedules}
          rowKey="id"
          size="middle"
          pagination={false}
          scroll={{ x: 800 }}
          // 点击行也可打开座位图（需有可选座位）
          onRow={(record) => ({
            onClick: () => {
              if (record.availableSeats > 0) {
                setSelectedSchedule(record)
              }
            },
            style: { cursor: record.availableSeats > 0 ? 'pointer' : 'not-allowed' },
          })}
        />
      )}
      {/* 座位图弹窗 */}
      <SeatMapModal
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  )
}
