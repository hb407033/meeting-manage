// API 插件 - 提供带认证的 API 调用功能
export default defineNuxtPlugin((nuxtApp) => {
  // 创建增强版的API调用函数
  const $apiFetch = $fetch.create({
    onRequest({ request, options }) {
      // 只对API请求添加认证头
      if (typeof request === 'string' && request.startsWith('/api/')) {
        // 从本地存储获取token（在插件初始化时，auth store 可能还未加载）
        const token = import.meta.client ? localStorage.getItem('token') : null

        console.log('🔍 API请求拦截:', request, 'Token存在:', !!token)

        if (token) {
          // 设置Authorization头
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`
          }
          console.log('✅ 已添加Authorization头到请求:', request)
        } else {
          console.warn('⚠️ API请求缺少token:', request)
        }
      }
    },

    onResponseError({ request, response, options }) {
      // 处理401错误
      if (response.status === 401) {
        console.warn('API请求认证失败，尝试刷新token:', request)

        // 尝试刷新token
        const refreshToken = import.meta.client ? localStorage.getItem('auth_refresh_token') : null

        if (refreshToken) {
          return $fetch('/api/auth/refresh', {
            method: 'POST',
            body: { refreshToken }
          }).then((refreshResponse: any) => {
            if (refreshResponse.success && refreshResponse.data) {
              const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.tokens

              // 更新本地存储
              if (import.meta.client) {
                localStorage.setItem('auth_access_token', accessToken)
                if (newRefreshToken) {
                  localStorage.setItem('auth_refresh_token', newRefreshToken)
                }
              }

              // 重试原请求
              options.headers = {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`
              }

              // 使用当前的 $apiFetch 实例重试请求，而不是递归调用
              return $fetch(request, options)
            } else {
              throw new Error('Token刷新失败')
            }
          }).catch((error) => {
            console.error('Token刷新失败，需要重新登录:', error)
            // 清除本地存储
            if (import.meta.client) {
              localStorage.removeItem('auth_access_token')
              localStorage.removeItem('auth_refresh_token')
              localStorage.removeItem('auth_user_data')
              localStorage.removeItem('auth_token_expires_at')
            }
            // 跳转到登录页
            navigateTo('/login')
            throw error
          })
        } else {
          // 没有refresh token，直接跳转登录
          if (import.meta.client) {
            navigateTo('/login')
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
    console.log('✅ API plugin: $apiFetch 已注册，增强版API调用已启用')
  }
})