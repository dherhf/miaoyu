import { Button, Tag, ErrorBlock } from 'antd-mobile'
import type { BaseCardProps, MovieListCardData } from '../../types'

const S: Record<string, React.CSSProperties> = {
  wrapper: { width: '100%', overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as const },
  scroll: { display: 'flex', gap: 16, padding: 12 },
  item: { flexShrink: 0, width: 128, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  posterWrap: {
    width: '100%',
    aspectRatio: '2/3',
    borderRadius: 8,
    overflow: 'hidden' as const,
    background: '#e5e7eb',
    position: 'relative' as const,
  },
  poster: { width: '100%', height: '100%', objectFit: 'cover' as const },
  placeholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 32, fontWeight: 700,
    background: '#3b82f6',
  },
  name: { fontWeight: 700, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  rating: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 },
  types: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  duration: { fontSize: 12, color: '#9ca3af' },
}

export default function MovieListCard({ data, onAction }: BaseCardProps<MovieListCardData>) {
  const movies = data?.movies || []

  if (movies.length === 0) {
    return <ErrorBlock status="empty" description="暂无符合条件的影片" />
  }

  return (
    <div style={S.wrapper}>
      <div style={S.scroll}>
        {movies.map((movie) => (
          <div key={movie.id} style={S.item}>
            {/* 海报 */}
            <div style={S.posterWrap}>
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.name}
                  style={S.poster}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div style={S.placeholder}>{movie.name?.charAt(0) || '影'}</div>
              )}
            </div>

            {/* 片名 */}
            <div style={S.name}>{movie.name}</div>

            {/* 评分 */}
            {movie.rating != null && movie.rating > 0 && (
              <div style={S.rating}>
                <span>⭐</span>
                <span style={{ color: '#d97706', fontWeight: 500 }}>{Number(movie.rating).toFixed(1)}</span>
              </div>
            )}

            {/* 类型标签 */}
            {movie.types && movie.types.length > 0 && (
              <div style={S.types}>
                {movie.types.slice(0, 3).map((t, i) => (
                  <Tag key={i} color="default" fill="outline">{t}</Tag>
                ))}
              </div>
            )}

            {/* 时长 */}
            {movie.duration != null && (
              <span style={S.duration}>{movie.duration}分钟</span>
            )}

            {/* 选择按钮 */}
            <Button
              color="primary"
              block
              size="small"
              style={{ marginTop: 4 }}
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
