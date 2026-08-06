import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Input, Spin, Tag } from 'antd'
import { getMovieList } from './api'
import type { MovieListVO } from './types'
import MovieCard from './components/MovieCard'
import { useHeaderBack } from '@/layouts/navBarStore'

const TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '动作', value: '动作' },
  { label: '喜剧', value: '喜剧' },
  { label: '爱情', value: '爱情' },
  { label: '科幻', value: '科幻' },
  { label: '悬疑', value: '悬疑' },
  { label: '动画', value: '动画' },
  { label: '纪录片', value: '纪录片' },
  { label: '其他', value: '其他' },
]

const SORT_OPTIONS = [
  { label: '最新上映', value: '' },
  { label: '评分最高', value: 'rating_desc' },
]

const PAGE_SIZE = 10

export default function MovieListPage() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<MovieListVO[]>([])
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [type, setType] = useState<string>('')
  const [sort, setSort] = useState<string>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadingRef = useRef(false)

  useHeaderBack(true)

  const fetchMovies = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const res = await getMovieList({
          keyword: keyword || undefined,
          type: type || undefined,
          page: pageNum,
          size: PAGE_SIZE,
          sort: sort || undefined,
        })
        if (reset) {
          setMovies(res.records)
        } else {
          setMovies((prev) => [...prev, ...res.records])
        }
        setHasMore(res.records.length === PAGE_SIZE)
      } catch {
        // 拦截器已统一提示
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [keyword, type, sort],
  )

  useEffect(() => {
    setPage(1)
    fetchMovies(1, true)
  }, [fetchMovies])

  const handleSearch = () => {
    setKeyword(searchText)
  }

  const handleLoadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovies(nextPage, false)
  }

  const handleMovieClick = (id: string) => {
    navigate(`/movies/${id}`)
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="flex flex-col gap-2 mb-4">
        <Input.Search
          placeholder="搜索影片名称"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          allowClear
          onClear={() => {
            setSearchText('')
            setKeyword('')
          }}
        />
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map((opt) => (
            <Tag.CheckableTag
              key={opt.value}
              checked={type === opt.value}
              onChange={() => setType(opt.value)}
            >
              {opt.label}
            </Tag.CheckableTag>
          ))}
        </div>
        <div className="flex gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <Tag.CheckableTag
              key={opt.value}
              checked={sort === opt.value}
              onChange={() => setSort(opt.value)}
            >
              {opt.label}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>

      {movies.length === 0 && !loading ? (
        <Empty description="暂无影片" className="py-12" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={() => handleMovieClick(movie.id)}
              />
            ))}
          </div>
          {hasMore ? (
            <div className="p-4 text-center">
              {loading ? (
                <Spin />
              ) : (
                <Button type="link" onClick={handleLoadMore}>
                  点击加载更多
                </Button>
              )}
            </div>
          ) : movies.length > 0 ? (
            <div className="p-4 text-center text-muted text-sm">
              没有更多了
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
