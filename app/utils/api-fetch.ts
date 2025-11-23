/**
 * 前端 API 工具函数
 * 提供带认证的 API 调用功能
 */

import { authStateManager } from '~/utils/auth-state-manager'

/**
 * 获取带认证的 API Fetch 函数
 * 这个函数会自动添加 Authorization header
 */
export function getApiFetch() {
  try {
    const nuxtApp = useNuxtApp()
    if (nuxtApp && nuxtApp.$apiFetch) {
      return nuxtApp.$apiFetch as typeof $fetch
    }

    // 如果无法获取 $apiFetch，则使用带认证的 $fetch 作为后备
    return $fetch.create({
      onRequest({ request, options }) {
        // 只对API请求添加认证头
        if (typeof request === 'string' && request.startsWith('/api/')) {
          // 使用 AuthStateManager 统一管理token
          const state = authStateManager.getState()
          const token = state.accessToken

          if (token) {
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${token}`
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('获取 $apiFetch 失败:', error)
    // 返回基本的 $fetch 作为后备
    return $fetch
  }
}