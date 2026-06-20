import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { notify } from '@/lib/toast'
import type { Result } from '@/types/api'

/**
 * MES 后端 axios 实例。
 * 要点：
 *  1. withCredentials 携带 Shiro 会话 Cookie；
 *  2. X-Requested-With 让未登录请求返回 401（而非 302 跳转，见后端 SpLoginFormFilter）；
 *  3. POST 入参表单编码（后端用实体/@ModelAttribute 绑定，非 JSON）；
 *  4. 响应按 Result.code 统一解包，code!==0 抛错并提示。
 */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/** 把普通对象序列化为 application/x-www-form-urlencoded */
function toFormUrlEncoded(data: Record<string, unknown>): string {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.append(key, String(value))
  })
  return params.toString()
}

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || 'get').toLowerCase()
  const isWriteMethod = method === 'post' || method === 'put' || method === 'patch'
  const isPlainObject =
    config.data &&
    typeof config.data === 'object' &&
    !(config.data instanceof FormData) &&
    !(config.data instanceof URLSearchParams)
  // 调用方已显式声明 JSON（用于后端 @RequestBody 接口，含嵌套对象/数组）则保持 JSON，由 axios 序列化
  const wantsJson = String(config.headers?.get?.('Content-Type') || '').includes('application/json')

  if (isWriteMethod && isPlainObject && !wantsJson) {
    config.headers.set('Content-Type', 'application/x-www-form-urlencoded')
    config.data = toFormUrlEncoded(config.data as Record<string, unknown>)
  }
  return config
})

/** 401 处理回调，由 router/store 注入，避免模块循环依赖 */
let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

service.interceptors.response.use(
  (response) => {
    const result = response.data as Result
    // 二进制/非标准响应（如文件流）直接放行
    if (result == null || typeof result !== 'object' || !('code' in result)) {
      return response.data
    }
    if (result.code !== 0) {
      notify.error(result.msg || '操作失败')
      return Promise.reject(result)
    }
    return result
  },
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.()
      return Promise.reject(error)
    }
    notify.error(error.message || '网络异常，请稍后重试')
    return Promise.reject(error)
  },
)

/** 通用请求方法，返回解包后的 Result<T> */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<Result<T>> {
  return service.request(config) as unknown as Promise<Result<T>>
}

export const http = {
  get: <T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'get', params }),
  post: <T = unknown>(url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'post', data }),
  /** 发送 JSON 请求体（用于后端 @RequestBody 接口，data 可含嵌套对象/数组） */
  postJson: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({
      ...config,
      url,
      method: 'post',
      data,
      headers: {
        ...(config?.headers as Record<string, string>),
        'Content-Type': 'application/json',
      },
    }),
}

export default service
