/**
 * 写操作自动重试：仅对网络错误（无响应/超时/断网）重试，业务错误（code≠0）不重试。
 * 重试时复用同一 requestId，确保命中后端幂等缓存。
 *
 * @param fn   要执行的异步请求（参数为当前 requestId）
 * @param requestId 幂等id
 * @param max  最大重试次数（默认 2）
 */
export async function withRetry<T>(
  fn: (requestId: string) => Promise<T>,
  requestId: string,
  max = 2,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await fn(requestId)
    } catch (err) {
      lastError = err
      // 业务错误（拦截器已处理）不重试
      if (err && typeof err === 'object' && '__handled' in err) throw err
      // 401/403 不重试
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 401 || status === 403) throw err
      // 最后一次不再等待
      if (attempt === max) break
      // 指数退避：1s, 2s
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  throw lastError
}
