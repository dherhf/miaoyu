import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/features/auth'
import { getMovieList } from '@/features/movie/api'
import type { MovieListVO } from '@/features/movie/types'
import MovieCard from '@/features/movie/components/MovieCard'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function HomePage() {
  const navigate = useNavigate()
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)
  const [loading, setLoading] = useState(true)
  const [movies, setMovies] = useState<MovieListVO[]>([])

  useHeaderBack()

  useEffect(() => {
    Promise.all([
      fetchCurrentUser().catch(() => {}),
      getMovieList({ page: 1, size: 6 }).then((res) => res.records).catch(() => []),
    ]).then(([, m]) => {
      if (m) setMovies(m)
    }).finally(() => setLoading(false))
  }, [fetchCurrentUser])

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
