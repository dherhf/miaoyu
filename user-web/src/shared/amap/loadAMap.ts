import AMapLoader from '@amap/amap-jsapi-loader'

let amapPromise: Promise<typeof AMap> | null = null

/**
 * 加载高德 JS SDK（全局单例，预加载 Geolocation 插件）。
 *
 * 需要配置环境变量：
 * - VITE_AMAP_JS_KEY: 高德 JS API Key（必填）
 * - VITE_AMAP_SECURITY_CODE: 安全密钥（JS API 2.0 需要，可选）
 */
export function loadAMap(): Promise<typeof AMap> {
  if (amapPromise) return amapPromise

  const key = import.meta.env.VITE_AMAP_JS_KEY
  if (!key) {
    return Promise.reject(
      new Error('VITE_AMAP_JS_KEY 未配置，请在 .env 中设置高德地图 JS API Key'),
    )
  }

  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE
  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode }
  }

  amapPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: ['AMap.Geolocation'],
  })

  return amapPromise
}
