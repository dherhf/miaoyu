import { StarFilled } from '@ant-design/icons'
import type { MovieListVO } from '../types'

export default function MovieCard({
  movie,
  onClick,
}: {
  movie: MovieListVO
  onClick: () => void
}) {

  return (
    <div
      className="group bg-surface-alt rounded-xl overflow-hidden cursor-pointer transition-[box-shadow,transform] duration-300 hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-code-bg">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-[13px]">无海报</div>
        )}

        {movie.types && movie.types.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1 max-w-[80%]">
            {movie.types.slice(0, 3).map((t) => (
              <span key={t} className="px-1.5 py-px text-[11px] font-medium text-white bg-black/60 rounded backdrop-blur-sm">{t}</span>
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-transparent transition-colors duration-300 pointer-events-none group-hover:bg-black/15 motion-reduce:transition-none" />
      </div>

      <div className="py-2.5 px-3">
        <h3 className="text-[15px] font-medium text-heading mb-1 overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-200 group-hover:text-accent motion-reduce:transition-none">{movie.name}</h3>

        {movie.rating > 0 && (
          <div className="flex items-center gap-1 mb-1 text-sm font-semibold text-rating">
            <StarFilled className="text-[13px]" />
            <span>{Number(movie.rating).toFixed(1)}</span>
          </div>
        )}

        <div className="text-xs text-muted mb-2">
          {movie.releaseDate} · {movie.duration}分钟
        </div>

        <button
          className="w-full py-1.5 border-none rounded-lg bg-accent text-white text-[13px] font-medium cursor-pointer transition-[background,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_2px_8px_var(--color-accent-soft)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          购票
        </button>
      </div>
    </div>
  )
}
