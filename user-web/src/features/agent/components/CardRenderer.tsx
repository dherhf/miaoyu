import type {
  MovieCardData,
  CinemaCardData,
  SessionCardData,
} from '../types'

interface CardRendererProps {
  cardType: string
  cardData: unknown
}

const cardListClass = 'mt-1.5 flex flex-col gap-1.5'
const cardLabelClass = 'text-xs font-medium text-accent px-0.5'
const cardItemClass = 'flex gap-2.5 p-3 rounded-[10px] bg-surface-alt border border-border'
const cardTitleClass = 'text-[15px] font-medium text-heading overflow-hidden text-ellipsis whitespace-nowrap'
const posterClass = 'w-14 h-[78px] rounded-md object-cover shrink-0'
const posterPlaceholderClass = 'w-14 h-[78px] rounded-md bg-code-bg flex items-center justify-center text-muted text-[11px] shrink-0'
const tagClass = 'text-[11px] py-0.5 px-[7px] rounded bg-accent-soft text-accent border border-accent-line whitespace-nowrap'

export default function CardRenderer({ cardType, cardData }: CardRendererProps) {
  switch (cardType) {
    case 'movie_list':
      return <MovieListCard cardData={cardData as { movies: MovieCardData[] } | undefined} />
    case 'cinema_list':
      return <CinemaListCard cardData={cardData as { cinemas: CinemaCardData[] } | undefined} />
    case 'session_list':
      return <SessionListCard cardData={cardData as { sessions: SessionCardData[] } | undefined} />
    case 'seat_map':
      return <InfoCard title="选座" lines={['选座功能开发中,请稍候']} />
    case 'order_confirm':
      return <GenericCard cardData={cardData} title="确认订单" />
    case 'order_success':
      return <GenericCard cardData={cardData} title="出票成功" />
    case 'recommend_tip':
      return <GenericCard cardData={cardData} title="推荐提示" />
    case 'pending_order':
      return <GenericCard cardData={cardData} title="待支付订单" />
    default:
      return <GenericCard cardData={cardData} title={cardType} />
  }
}

function MovieListCard({ cardData }: { cardData?: { movies: MovieCardData[] } }) {
  const movies = cardData?.movies ?? []
  if (movies.length === 0) return null
  return (
    <div className={cardListClass}>
      <div className={cardLabelClass}>推荐影片</div>
      {movies.map((m) => (
        <div key={m.id} className={cardItemClass}>
          {m.posterUrl ? (
            <img
              src={m.posterUrl}
              alt={m.name}
              className={posterClass}
            />
          ) : (
            <div className={posterPlaceholderClass}>
              <span className="text-[11px]">无海报</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={cardTitleClass}>{m.name}</div>
            <div className="flex items-center gap-2 mt-[3px]">
              {m.rating > 0 && (
                <span className="text-[13px] text-rating font-medium">
                  ★ {Number(m.rating).toFixed(1)}
                </span>
              )}
              {m.duration > 0 && (
                <span className="text-xs text-muted">
                  {m.duration}分钟
                </span>
              )}
            </div>
            {m.types?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {m.types.map((t) => (
                  <span key={t} className={tagClass}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function CinemaListCard({ cardData }: { cardData?: { cinemas: CinemaCardData[] } }) {
  const cinemas = cardData?.cinemas ?? []
  if (cinemas.length === 0) return null
  return (
    <div className={cardListClass}>
      <div className={cardLabelClass}>推荐影院</div>
      {cinemas.map((c) => (
        <div key={c.id} className={cardItemClass}>
          <div className="flex-1 min-w-0">
            <div className={cardTitleClass}>{c.name}</div>
            {c.address && (
              <div className="text-[13px] text-muted mt-[3px] leading-[1.4]">
                {c.address}
              </div>
            )}
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {c.distance && (
                <span className={tagClass}>{c.distance}</span>
              )}
              {c.rating > 0 && (
                <span className={`${tagClass} text-rating border-[rgba(245,166,35,0.4)]`}>
                  ★ {Number(c.rating).toFixed(1)}
                </span>
              )}
            </div>
            {c.facilities?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {c.facilities.map((f) => (
                  <span key={f} className={tagClass}>{f}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SessionListCard({ cardData }: { cardData?: { sessions: SessionCardData[] } }) {
  const sessions = cardData?.sessions ?? []
  if (sessions.length === 0) return null
  return (
    <div className={cardListClass}>
      <div className={cardLabelClass}>可选场次</div>
      {sessions.map((s) => (
        <div key={s.id} className={cardItemClass}>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className={cardTitleClass}>
                {s.showDate} {s.startTime}
              </span>
              <span className="text-[17px] font-semibold text-accent">
                ¥{s.price}
              </span>
            </div>
            <div className="text-[13px] text-muted mt-[3px]">
              {s.startTime} - {s.endTime} / {s.hallName}
            </div>
            <div className="flex gap-1 flex-wrap mt-1.5">
              <span className={tagClass}>{s.languageVersion}</span>
              <span className={`${tagClass} ${s.availableSeats > 5 ? 'text-accent border-accent-line' : 'text-danger border-[rgba(232,85,58,0.4)]'}`}>
                余{s.availableSeats}座
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function GenericCard({ cardData, title }: { cardData: unknown; title: string }) {
  if (!cardData || typeof cardData !== 'object') return null
  const entries = Object.entries(cardData as Record<string, unknown>)
  if (entries.length === 0) return null
  return (
    <div className={cardListClass}>
      <div className={cardLabelClass}>{title}</div>
      <div className={`${cardItemClass} flex-col gap-1.5!`}>
        {entries.map(([key, val]) => (
          <div key={key} className="text-[13px] leading-[1.5] flex gap-2">
            <span className="text-muted shrink-0 min-w-[64px]">{key}</span>
            <span className="text-heading font-medium">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className={cardListClass}>
      <div className={cardLabelClass}>{title}</div>
      <div className={`${cardItemClass} flex-col gap-1!`}>
        {lines.map((l, i) => (
          <div key={i} className="text-[13px] text-muted">{l}</div>
        ))}
      </div>
    </div>
  )
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
