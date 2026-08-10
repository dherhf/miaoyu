import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/features/auth'
import { getMovieList } from '@/features/movie/api'
import type { MovieListVO } from '@/features/movie/types'
import MovieCard from '@/features/movie/components/MovieCard'
import { useHeaderBack } from '@/layouts/navBarStore'

/**
 * 首页组件。
 * 展示"正在热映"影片列表，点击影片卡片跳转到影片详情页。
 * 页面加载时并行获取当前用户信息和热映影片列表（前6条）。
 */
export default function HomePage() {
  const navigate = useNavigate()
  // 获取当前用户信息的方法
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  // 加载状态
  const [loading, setLoading] = useState(true)
  // 热映影片列表
  const [movies, setMovies] = useState<MovieListVO[]>([])

  // 配置 Header 不显示返回按钮
  useHeaderBack()

  useEffect(() => {
    // 并行请求：获取用户信息 + 获取热映影片列表（第1页，6条）
    Promise.all([
      fetchCurrentUser().catch(() => {}),
      getMovieList({ page: 1, size: 6 }).then((res) => res.records).catch(() => []),
    ]).then(([, m]) => {
      if (m) setMovies(m)
    }).finally(() => setLoading(false))
  }, [fetchCurrentUser])

  // 加载中显示骨架
  if (loading) {
    return (
      <div className="flex-1 p-12 text-center">
        <Spin />
      </div>
    )
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <h2 className="text-xl font-medium text-heading mb-4">
        正在热映
      </h2>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => navigate(`/movies/${movie.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-muted">
          暂无热映影片
        </div>
      )}
    </div>
  )
}
