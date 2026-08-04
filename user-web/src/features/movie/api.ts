import request from '@/shared/request'
import type { MovieListVO, MovieVO, PageResult, MovieListParams } from './types'

export async function getMovieList(
  params: MovieListParams,
): Promise<PageResult<MovieListVO>> {
  const res = await request.get<PageResult<MovieListVO>>('/movies', { params })
  return res.data
}

export async function getMovieDetail(id: string): Promise<MovieVO> {
  const res = await request.get<MovieVO>(`/movies/${id}`)
  return res.data
}
