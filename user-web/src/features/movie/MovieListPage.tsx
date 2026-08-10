import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Empty, Input, Spin, Tag } from 'antd'
import { getMovieList } from './api'
import type { MovieListVO } from './types'
import MovieCard from './components/MovieCard'
import { useHeaderBack } from '@/layouts/navBarStore'

/** 影片类型筛选选项 */
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

/** 排序选项 */
const SORT_OPTIONS = [
  { label: '最新上映', value: '' },
  { label: '评分最高', value: 'rating_desc' },
]

/** 每页条数 */
const PAGE_SIZE = 10

/**
 * 影片列表页组件。
 * 提供影片搜索（关键词）、类型筛选、排序功能。
 * 支持滚动加载更多（分页加载），点击影片卡片跳转详情页。
 */
export default function MovieListPage() {
  const navigate = useNavigate()
  // 影片列表
  const [movies, setMovies] = useState<MovieListVO[]>([])
  // 实际搜索关键词（按下搜索按钮后更新）
  const [keyword, setKeyword] = useState('')
  // 搜索框输入文本
  const [searchText, setSearchText] = useState('')
  // 当前选中的类型筛选
  const [type, setType] = useState<string>('')
  // 当前选中的排序方式
  const [sort, setSort] = useState<string>('')
  // 当前页码
  const [page, setPage] = useState(1)
  // 加载状态
  const [loading, setLoading] = useState(false)
  // 是否还有更多数据
  const [hasMore, setHasMore] = useState(true)
  // 防止重复请求的标记（使用 ref 避免闭包问题）
  const loadingRef = useRef(false)

  // 配置 Header 显示返回按钮
  useHeaderBack(true)

  /**
   * 获取影片列表。
   * @param pageNum 页码
   * @param reset 是否重置列表（true=替换，false=追加）
   */
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
          // 重置：替换列表
          setMovies(res.records)
        } else {
          // 加载更多：追加到列表
          setMovies((prev) => [...prev, ...res.records])
        }
        // 返回条数不足一页则无更多数据
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

  // 搜索关键词、类型或排序变化时重新加载第一页
  useEffect(() => {
    setPage(1)
    fetchMovies(1, true)
  }, [fetchMovies])

  /** 点击搜索按钮：将输入框文本设为搜索关键词 */
  const handleSearch = () => {
    setKeyword(searchText)
  }

  /** 加载更多：页码+1，追加数据 */
  const handleLoadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovies(nextPage, false)
  }

  /** 点击影片卡片：跳转到影片详情页 */
  const handleMovieClick = (id: string) => {
    navigate(`/movies/${id}`)
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      {/* 搜索与筛选区域 */}
      <div className="flex flex-col gap-2 mb-4">
        {/* 关键词搜索框 */}
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
        {/* 类型筛选标签 */}
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
        {/* 排序标签 */}
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

      {/* 影片列表区域 */}
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
          {/* 加载更多 / 没有更多 */}
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
