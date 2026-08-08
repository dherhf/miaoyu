import { useEffect, useState } from 'react'
import { Table, Empty, Spin, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getScheduleList } from '../api'
import type { ScheduleListVO } from '../types'
import SeatMapModal from './SeatMapModal'

const MAX_SEATS = 6

export default function ScheduleTable({ movieId }: { movieId: string }) {
  const [schedules, setSchedules] = useState<ScheduleListVO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleListVO | null>(null)

  useEffect(() => {
    setLoading(true)
    getScheduleList(movieId)
      .then((res) => setSchedules(res.records))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [movieId])

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
      render: (v: string, record: any) => v && <Tag color="purple">{record.languageVersionName || v}</Tag>,
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
      render: (v: number, record) => {
        if (v <= 0) return <span className="text-muted">已满</span>
        if (v <= MAX_SEATS) return <span className="text-danger">{v}</span>
        return <span className="text-muted">{v}/{record.totalSeats}</span>
      },
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
          scroll={{ x: 700 }}
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
      <SeatMapModal
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  )
}
