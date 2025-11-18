/**
 * 防抖处理 Composable
 * 用于搜索输入等需要延迟处理的场景
 */

import { ref, Ref, watch } from 'vue'

export function useDebounce<T>(
  initialValue: T,
  delay: number = 300
): {
  debouncedValue: Ref<T>
  value: Ref<T>
  flush: () => void
  cancel: () => void
} {
  const value = ref(initialValue) as Ref<T>
  const debouncedValue = ref(initialValue) as Ref<T>

  let timeoutId: NodeJS.Timeout | null = null

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const flush = () => {
    cancel()
    debouncedValue.value = value.value
  }

  watch(
    value,
    (newValue) => {
      cancel()
      timeoutId = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    },
    { immediate: true }
  )

  return {
    debouncedValue,
    value,
    flush,
    cancel
  }
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    const callNow = immediate && !timeoutId

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (!immediate) {
        func.apply(this, args)
      }
    }, delay)

    if (callNow) {
      func.apply(this, args)
    }
  }
}