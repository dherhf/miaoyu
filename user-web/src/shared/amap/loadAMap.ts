import AMapLoader from '@amap/amap-jsapi-loader'

// 高德 SDK 加载 Promise（全局单例，避免重复加载）
let amapPromise: Promise<typeof AMap> | null = null

/**
 * 加载高德 JS SDK（全局单例，预加载 Geolocation 插件）。
 *
 * 需要配置环境变量：
 * - VITE_USER_AMAP_JS_KEY: 高德 JS API Key（必填）
 * - VITE_USER_AMAP_SECURITY_CODE: 安全密钥（JS API 2.0 需要，可选）
 *
 * @returns 高德 SDK 实例
 */
export function loadAMap(): Promise<typeof AMap> {
  // 已加载过则直接返回缓存的 Promise
  if (amapPromise) return amapPromise

  const key = import.meta.env.VITE_USER_AMAP_JS_KEY
  if (!key) {
    return Promise.reject(
      new Error('VITE_USER_AMAP_JS_KEY 未配置，请在 ../.env 中设置高德地图 JS API Key'),
    )
  }

  // 配置安全密钥（JS API 2.0 需要）
  const securityCode = import.meta.env.VITE_USER_AMAP_SECURITY_CODE
  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode }
  }

  // 使用 AMapLoader 加载 SDK，预加载 Geolocation 和 Geocoder 插件
  amapPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: ['AMap.Geolocation', 'AMap.Geocoder'],
  })

  return amapPromise
}
