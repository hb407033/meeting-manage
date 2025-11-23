/**
 * 增强的API Composable
 */

import { ref, computed } from 'vue'
import { apiRequest, batchApiRequest, type ApiRequestConfig } from '~/utils/api-interceptor'
import type { ApiResponse } from '~/utils/api-interceptor'

export interface UseApiOptions<T = any> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  retry?: boolean
  maxRetries?: number
}

export interface UseApiReturn<T = any, P = any> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<any>
  execute: (params?: P) => Promise<T | null>
  reset: () => void
  refresh: () => Promise<T | null>
  isPending: Ref<boolean>
}

export function useApi<T = any, P = any>(
  config: ApiRequestConfig | (() => ApiRequestConfig),
  options: UseApiOptions<T> = {}
): UseApiReturn<T, P> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isPending = ref(false)

  const getConfig = () => typeof config === 'function' ? config() : config

  const execute = async (params?: P): Promise<T | null> => {
    const requestConfig = getConfig()

    if (params) {
      requestConfig.body = { ...requestConfig.body, ...params }
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiRequest<T>(requestConfig)

      if (response.success && response.data) {
        data.value = response.data
        options.onSuccess?.(response.data)
        return response.data
      } else {
        throw new Error(response.message || '请求失败')
      }
    } catch (err) {
      error.value = err
      options.onError?.(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = null
    loading.value = false
    error.value = null
  }

  const refresh = () => execute()

  // 立即执行
  if (options.immediate) {
    execute()
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refresh,
    isPending
  }
}

export function useBatchApi<T = any>(
  configs: ApiRequestConfig[] | (() => ApiRequestConfig[])
) {
  const data = ref<T[]>([])
  const loading = ref(false)
  const error = ref<any[]>([])

  const getConfigs = () => typeof configs === 'function' ? configs() : configs

  const execute = async () => {
    loading.value = true
    error.value = []

    try {
      const response = await batchApiRequest<T>(getConfigs())

      const successfulData: T[] = []
      const errors: any[] = []

      response.forEach((result, index) => {
        if (result.success && result.data) {
          successfulData.push(result.data)
        } else {
          errors.push({
            index,
            error: result.message,
            config: getConfigs()[index]
          })
        }
      })

      data.value = successfulData
      error.value = errors

      return {
        success: successfulData,
        errors
      }
    } catch (err) {
      error.value = [err]
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    execute
  }
}

export function useConcurrentApi<T = any>(
  requestFactory: () => ApiRequestConfig[],
  options: {
    concurrency?: number
    onSuccess?: (results: T[]) => void
    onError?: (errors: any[]) => void
  } = {}
) {
  const data = ref<T[]>([])
  const loading = ref(false)
  const error = ref<any[]>([])
  const completed = ref(0)
  const total = ref(0)

  const execute = async () => {
    const configs = requestFactory()
    total.value = configs.length
    completed.value = 0
    loading.value = true
    error.value = []

    const concurrency = options.concurrency || 3
    const results: T[] = []
    const errors: any[] = []

    // 分批处理请求
    for (let i = 0; i < configs.length; i += concurrency) {
      const batch = configs.slice(i, i + concurrency)

      const batchPromises = batch.map(async (config, batchIndex) => {
        try {
          const response = await apiRequest<T>(config)
          if (response.success && response.data) {
            results[i + batchIndex] = response.data
          } else {
            errors.push({
              index: i + batchIndex,
              error: response.message || '请求失败',
              config
            })
          }
        } catch (err) {
          errors.push({
            index: i + batchIndex,
            error: err,
            config
          })
        } finally {
          completed.value++
        }
      })

      await Promise.all(batchPromises)
    }

    data.value = results.filter(Boolean)
    error.value = errors
    loading.value = false

    if (errors.length === 0) {
      options.onSuccess?.(data.value)
    } else {
      options.onError?.(errors)
    }

    return {
      success: data.value,
      errors: error.value
    }
  }

  const progress = computed(() => {
    return total.value > 0 ? completed.value / total.value : 0
  })

  return {
    data,
    loading,
    error,
    completed,
    total,
    progress,
    execute
  }
}

// 防抖API请求
export function useDebouncedApi<T = any, P = any>(
  config: ApiRequestConfig | (() => ApiRequestConfig),
  delay = 300,
  options: UseApiOptions<T> = {}
) {
  const { data, loading, error, execute, reset } = useApi<T, P>(config, options)
  const debouncedExecute = useDebounceFn(execute, delay)

  return {
    data,
    loading,
    error,
    execute: debouncedExecute,
    reset
  }
}

// 节流API请求
export function useThrottledApi<T = any, P = any>(
  config: ApiRequestConfig | (() => ApiRequestConfig),
  throttle = 1000,
  options: UseApiOptions<T> = {}
) {
  const { data, loading, error, execute, reset } = useApi<T, P>(config, options)
  const throttledExecute = useThrottleFn(execute, throttle)

  return {
    data,
    loading,
    error,
    execute: throttledExecute,
    reset
  }
}

// 带缓存的API请求
export function useCachedApi<T = any>(
  key: string,
  config: ApiRequestConfig | (() => ApiRequestConfig),
  options: {
    ttl?: number // 缓存时间（毫秒）
    staleWhileRevalidate?: boolean
  } = {}
) {
  const { data, loading, error, execute, reset } = useApi<T>(config)
  const cache = new Map<string, { data: T; timestamp: number }>()

  const getCachedData = () => {
    const cached = cache.get(key)
    if (cached) {
      const now = Date.now()
      const ttl = options.ttl || 5 * 60 * 1000 // 默认5分钟

      if (now - cached.timestamp < ttl) {
        return cached.data
      }
    }
    return null
  }

  const setCachedData = (newData: T) => {
    cache.set(key, {
      data: newData,
      timestamp: Date.now()
    })
  }

  const cachedExecute = async () => {
    const cached = getCachedData()

    if (cached) {
      data.value = cached

      // 如果启用stale-while-revalidate，后台更新数据
      if (options.staleWhileRevalidate) {
        execute().then(newData => {
          if (newData) {
            setCachedData(newData)
          }
        }).catch(() => {
          // 忽略后台更新错误
        })
      }

      return cached
    }

    const result = await execute()
    if (result) {
      setCachedData(result)
    }
    return result
  }

  const clearCache = () => {
    cache.delete(key)
  }

  return {
    data,
    loading,
    error,
    execute: cachedExecute,
    reset,
    clearCache
  }
}