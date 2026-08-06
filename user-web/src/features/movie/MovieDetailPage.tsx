import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Spin, Tag } from 'antd'
import { getMovieDetail } from './api'
import type { MovieVO } from './types'
import { useHeaderBack } from '@/layouts/navBarStore'
import ScheduleTable from './components/ScheduleTable'

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<MovieVO | null>(null)
  const [loading, setLoading] = useState(true)

  useHeaderBack(true)

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

  if (loading) {
    return (
      <div className="flex-1 p-12 text-center">
        <Spin />
      </div>
    )
  }

  if (!movie) {
    return null
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="flex flex-wrap gap-4 md:flex-nowrap md:gap-6">
        {movie.posterUrl && (
          <div className="w-[110px] shrink-0 text-left sm:w-[140px] md:w-[280px] md:shrink-0">
            <img
              src={movie.posterUrl}
              alt={movie.name}
              className="w-full h-auto rounded-xl object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl m-0 mb-2">{movie.name}</h1>

          {movie.rating > 0 && (
            <div className="text-lg font-medium text-rating mb-2">
              ★ {Number(movie.rating).toFixed(1)}
            </div>
          )}

          {movie.types && movie.types.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {movie.types.map((t) => (
                <Tag key={t} color="purple">{t}</Tag>
              ))}
            </div>
          )}

          <div className="mb-4 text-[15px] text-muted">
            <div className="mb-1">上映日期：{movie.releaseDate}</div>
            <div className="mb-1">片长：{movie.duration}分钟</div>
            {movie.director && <div className="mb-1">导演：{movie.director}</div>}
            {movie.actors && <div className="mb-1">主演：{movie.actors}</div>}
          </div>
        </div>

        {movie.description && (
          <div className="w-full md:flex-1 md:min-w-0">
            <h2 className="text-lg mb-2">剧情简介</h2>
            <p className="text-[15px] leading-[1.6] text-muted whitespace-pre-wrap">
              {movie.description}
            </p>
          </div>
        )}
      </div>

      <ScheduleTable movieId={id!} />
    </div>
  )
}
