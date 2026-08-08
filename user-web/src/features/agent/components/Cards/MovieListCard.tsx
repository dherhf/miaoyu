import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, MovieListCardData } from '../../types'

export default function MovieListCard({ data, onAction }: BaseCardProps<MovieListCardData>) {
  const movies = data?.records || []

  if (movies.length === 0) {
    return <Empty description="暂无符合条件的影片" />
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 p-3">
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0 w-32 flex flex-col gap-2">
            {/* 海报 */}
            <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-border relative">
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[32px] font-bold bg-[#3b82f6]">
                  {movie.name?.charAt(0) || '影'}
                </div>
              )}
            </div>

            {/* 片名 */}
            <div className="font-bold text-sm text-heading overflow-hidden text-ellipsis whitespace-nowrap">{movie.name}</div>

            {/* 评分 */}
            {movie.rating != null && movie.rating > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span>⭐</span>
                <span className="text-rating font-medium">{Number(movie.rating).toFixed(1)}</span>
              </div>
            )}

            {/* 类型标签 */}
            {movie.types && movie.types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {movie.types.slice(0, 3).map((t, i) => (
                  <Tag key={i}>{t}</Tag>
                ))}
              </div>
            )}

            {/* 时长 */}
            {movie.duration != null && (
              <span className="text-xs text-muted">{movie.duration}分钟</span>
            )}

            {/* 选择按钮 */}
            <Button
              type="primary"
              block
              size="small"
              className="mt-1"
              onClick={() => onAction(`选${movie.name}`)}
            >
              选择
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
