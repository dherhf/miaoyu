export interface MovieListVO {
  id: string
  name: string
  types: string[]
  posterUrl: string
  rating: number
  duration: number
  releaseDate: string
  status: number
}

export interface MovieVO {
  id: string
  name: string
  types: string[]
  posterUrl: string
  rating: number
  duration: number
  releaseDate: string
  director: string
  actors: string
  description: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface PageResult<T> {
  total: number
  page: number
  size: number
  records: T[]
}

export interface MovieListParams {
  keyword?: string
  type?: string
  page?: number
  size?: number
  sort?: string
}
