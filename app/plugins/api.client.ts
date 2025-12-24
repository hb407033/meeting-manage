// API 插件 - 提供带认证的 API 调用功能
import { authStateManager } from '~/utils/auth-state-manager'
import { tokenRefreshManager } from '~/utils/token-refresh-manager'

export default defineNuxtPlugin((nuxtApp) => {
  // 创建增强版的API调用函数
  const $apiFetch = $fetch.create({
    onRequest({ request, options }) {
      // 只对API请求添加认证头
      if (typeof request === 'string' && request.startsWith('/api/')) {
        // 统一从AuthStateManager获取token，确保状态一致性
        let token = null

        if (import.meta.client) {
          // 立即获取当前状态
          const state = authStateManager.getState()
          token = state.accessToken
        }

        console.log('🔍 API请求拦截:', request, 'Token存在:', !!token)

        if (token) {
          // 设置Authorization头 - 使用简单的方式避免类型问题
          if (!options.headers) {
            options.headers = {}
          }
          // 直接设置header
          ;(options.headers as any)['authorization'] = `Bearer ${token}`
          console.log('✅ 已添加Authorization头到请求:', request)
        } else {
          console.warn('⚠️ API请求缺少token:', request)
        }
      }
    },

    onResponseError({ request, response, options }) {
      // 处理401错误 - 使用TokenRefreshManager统一处理刷新
      if (response.status === 401) {
        console.warn('API请求认证失败，尝试刷新token:', request)

        // 统一从AuthStateManager获取refreshToken
        let refreshToken = null
        if (import.meta.client) {
          const state = authStateManager.getState()
          refreshToken = state.refreshToken
        }

        if (refreshToken) {
          // 使用TokenRefreshManager处理并发刷新
          return tokenRefreshManager.refreshTokens(refreshToken).then((tokens) => {
            // 通过AuthStateManager更新状态，确保统一管理
            if (import.meta.client) {
              const currentState = authStateManager.getState()
              if (currentState.user) {
                authStateManager.updateAuthState(currentState.user, tokens)
              }
            }

            // 重试原请求
            if (!options.headers) {
              options.headers = {}
            }
            ;(options.headers as any)['authorization'] = `Bearer ${tokens.accessToken}`

            // 使用当前的 $apiFetch 实例重试请求
            return $fetch(request, options as any)
          }).catch((error) => {
            console.error('Token刷新失败，需要重新登录:', error)
            // 统一清除AuthStateManager的状态
            if (import.meta.client) {
              authStateManager.clearAuthState()
            }
            // 跳转到登录页
            navigateTo('/auth/login')
            throw error
          })
        } else {
          // 没有refresh token，直接跳转登录
          if (import.meta.client) {
            navigateTo('/auth/login')
          }
          throw new Error('未找到刷新令牌')
        }
      }
    }
  })

  // 提供增强版的API调用函数
  nuxtApp.provide('$apiFetch', $apiFetch)

  if (import.meta.client) {
    nuxtApp.vueApp.config.globalProperties.$apiFetch = $apiFetch
    console.log('✅ API plugin: $apiFetch 已注册，统一使用AuthStateManager管理token')
  }
})