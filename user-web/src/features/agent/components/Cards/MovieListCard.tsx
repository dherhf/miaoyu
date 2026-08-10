import { Button, Tag, Empty } from 'antd'
import type { BaseCardProps, MovieListCardData } from '../../types'

/**
 * 影片列表卡片：横向滚动展示满足条件的影片列表。
 * 每部影片展示海报、片名、评分、类型标签、片长，并配有"选择"按钮；
 * 点击按钮触发 onAction 把选择该影片的意图发给对话。
 * 数据来源：后端 movieList 卡片。
 */
export default function MovieListCard({ data, onAction }: BaseCardProps<MovieListCardData>) {
  const movies = data?.records || []

  // 无数据时展示空状态
  if (movies.length === 0) {
    return <Empty description="暂无符合条件的影片" />
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 p-3">
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0 w-32 flex flex-col gap-2">
            {/* 海报：有图展示图片（加载失败隐藏），无图显示片名首字 */}
            <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-border relative">
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // 海报加载失败时隐藏 img，露出底色
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

            {/* 类型标签：最多展示 3 个 */}
            {movie.types && movie.types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {movie.types.slice(0, 3).map((t, i) => (
                  <Tag key={i}>{t}</Tag>
                ))}
              </div>
            )}

            {/* 片长 */}
            {movie.duration != null && (
              <span className="text-xs text-muted">{movie.duration}分钟</span>
            )}

            {/* 选择按钮：触发 onAction 选择该影片 */}
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