import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Spin, Tag } from 'antd'
import { getMovieDetail } from './api'
import type { MovieVO } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'
import ScheduleTable from './components/ScheduleTable'

/**
 * 影片详情页组件。
 * 展示影片海报、名称、评分、类型标签、上映日期、片长、导演、主演和剧情简介。
 * 页面底部展示排片场次表格（ScheduleTable）供用户选座购票。
 */
export default function MovieDetailPage() {
  // 从路由参数获取影片ID
  const { id } = useParams<{ id: string }>()
  // 影片详情数据
  const [movie, setMovie] = useState<MovieVO | null>(null)
  // 加载状态
  const [loading, setLoading] = useState(true)

  // 配置 Header 显示返回按钮
  useHeaderBack(true)

  // 影片ID变化时重新加载影片详情
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getMovieDetail(id)
      .then(setMovie)
      .catch(() => {
        // 拦截器已统一提示
      })
      .finally(() => setLoading(false))
  }, [id])

  // 加载中显示骨架
  if (loading) {
    return (
      <div className="flex-1 p-12 text-center">
        <Spin />
      </div>
    )
  }

  // 数据为空时不渲染
  if (!movie) {
    return null
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      {/* 影片基本信息区域 */}
      <div className="flex flex-wrap gap-4 md:flex-nowrap md:gap-6">
        {/* 海报 */}
        {movie.posterUrl && (
          <div className="w-[110px] shrink-0 text-left sm:w-[140px] md:w-[280px] md:shrink-0">
            <img
              src={movie.posterUrl}
              alt={movie.name}
              className="w-full h-auto rounded-xl object-cover"
            />
          </div>
        )}

        {/* 影片信息 */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl m-0 mb-2">{movie.name}</h1>

          {/* 评分 */}
          {movie.rating > 0 && (
            <div className="text-lg font-medium text-rating mb-2">
              ★ {Number(movie.rating).toFixed(1)}
            </div>
          )}

          {/* 类型标签 */}
          {movie.types && movie.types.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {movie.types.map((t) => (
                <Tag key={t} color="purple">{t}</Tag>
              ))}
            </div>
          )}

          {/* 上映日期、片长、导演、主演 */}
          <div className="mb-4 text-[15px] text-muted">
            <div className="mb-1">上映日期：{movie.releaseDate}</div>
            <div className="mb-1">片长：{movie.duration}分钟</div>
            {movie.director && <div className="mb-1">导演：{movie.director}</div>}
            {movie.actors && <div className="mb-1">主演：{movie.actors}</div>}
          </div>
        </div>

        {/* 剧情简介 */}
        {movie.description && (
          <div className="w-full md:flex-1 md:min-w-0">
            <h2 className="text-lg mb-2">剧情简介</h2>
            <p className="text-[15px] leading-[1.6] text-muted whitespace-pre-wrap">
              {movie.description}
            </p>
          </div>
        )}
      </div>

      {/* 排片场次表格 */}
      <ScheduleTable movieId={id!} />
    </div>
  )
}
