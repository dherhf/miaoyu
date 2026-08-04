import type { BaseCardProps, MovieListCardData } from '../../types'

const s = {
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
  typeTag: { fontSize: 12, padding: '2px 6px', background: '#f3f4f6', color: '#6b7280', borderRadius: 4 },
  duration: { fontSize: 12, color: '#9ca3af' },
  btn: {
    marginTop: 4, width: '100%', padding: '6px 12px',
    background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },
}

export default function MovieListCard({ data, onAction }: BaseCardProps<MovieListCardData>) {
  const movies = data?.movies || []

  if (movies.length === 0) {
    return (
      <div style={s.empty}>
        <span style={{ fontSize: 48, marginBottom: 8 }}>🎬</span>
        <span>暂无符合条件的影片</span>
      </div>
    )
  }

  return (
    <div style={s.wrapper}>
      <div style={s.scroll}>
        {movies.map((movie) => (
          <div key={movie.id} style={s.item}>
            {/* 海报 */}
            <div style={s.posterWrap}>
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.name}
                  style={s.poster}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div style={s.placeholder}>{movie.name?.charAt(0) || '影'}</div>
              )}
            </div>

            {/* 片名 */}
            <div style={s.name}>{movie.name}</div>

            {/* 评分 */}
            {movie.rating != null && movie.rating > 0 && (
              <div style={s.rating}>
                <span>⭐</span>
                <span style={{ color: '#d97706', fontWeight: 500 }}>{Number(movie.rating).toFixed(1)}</span>
              </div>
            )}

            {/* 类型标签 */}
            {movie.types && movie.types.length > 0 && (
              <div style={s.types}>
                {movie.types.slice(0, 3).map((t, i) => (
                  <span key={i} style={s.typeTag}>{t}</span>
                ))}
              </div>
            )}

            {/* 时长 */}
            {movie.duration != null && (
              <span style={s.duration}>{movie.duration}分钟</span>
            )}

            {/* 选择按钮 */}
            <button
              style={s.btn}
              onClick={() => onAction(`选${movie.name}`)}
            >
              选择
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
