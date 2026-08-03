// ===================== 通用 API 响应类型 =====================

/** 后端统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页查询结果 */
export interface PageResult<T> {
  total: number;
  page: number;
  size: number;
  records: T[];
}
