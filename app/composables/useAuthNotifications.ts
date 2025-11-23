/**
 * 认证状态通知 Composable
 */

import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { authErrorHandler } from '~/utils/auth-error-handler'

export interface AuthNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title?: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actions?: {
    label: string
    handler: () => void
    variant?: 'solid' | 'outline' | 'ghost' | 'soft'
  }[]
  timeout?: number
  persistent?: boolean
  closable?: boolean
}

export interface UseAuthNotificationsOptions {
  enableToast?: boolean
  enableRecoveryDialog?: boolean
  autoHideTimeout?: number
  showStateDetails?: boolean
}

export function useAuthNotifications(options: UseAuthNotificationsOptions = {}) {
  const authStore = useAuthStore()

  const {
    enableToast = true,
    enableRecoveryDialog = true,
    autoHideTimeout = 5000,
    showStateDetails = false
  } = options

  // 状态
  const notifications = ref<AuthNotification[]>([])
  const showRecoveryDialog = ref(false)
  const recoveryMessage = ref('')
  const lastError = ref<any>(null)

  // 通知管理方法
  const addNotification = (notification: Omit<AuthNotification, 'id'>) => {
    const id = Date.now().toString()
    const fullNotification: AuthNotification = {
      id,
      closable: true,
      timeout: autoHideTimeout,
      persistent: false,
      ...notification
    }

    notifications.value.push(fullNotification)

    // 自动移除通知
    if (fullNotification.timeout && !fullNotification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, fullNotification.timeout)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  // 认证错误处理
  const handleAuthError = (error: any, context?: { action?: string; url?: string }) => {
    console.log('[AuthNotifications] 处理认证错误:', error)

    const authError = authErrorHandler.handleError(error, context || {})
    lastError.value = authError

    const userMessage = authErrorHandler.getUserMessage(authError)

    // 根据错误严重程度决定处理方式
    if (authError.severity === 'critical') {
      // 严重错误：显示恢复对话框
      recoveryMessage.value = userMessage
      showRecoveryDialog.value = true

      addNotification({
        type: 'error',
        title: '严重认证错误',
        message: userMessage,
        severity: 'critical',
        persistent: true,
        closable: false,
        actions: [
          {
            label: '重新登录',
            handler: () => {
              showRecoveryDialog.value = false
              navigateTo('/auth/login')
            },
            variant: 'solid'
          }
        ]
      })
    } else if (authError.severity === 'high') {
      // 高严重度错误：显示警告并可能显示恢复对话框
      addNotification({
        type: 'warning',
        title: '认证状态异常',
        message: userMessage,
        severity: 'high',
        timeout: 10000,
        actions: [
          {
            label: '查看详情',
            handler: () => {
              recoveryMessage.value = userMessage
              showRecoveryDialog.value = true
            },
            variant: 'outline'
          },
          {
            label: '重新登录',
            handler: () => {
              navigateTo('/auth/login')
            },
            variant: 'solid'
          }
        ]
      })

      // 如果是令牌相关错误，也显示恢复对话框
      if (authError.type === 'TOKEN_EXPIRED' || authError.type === 'INVALID_REFRESH_TOKEN') {
        recoveryMessage.value = userMessage
        if (enableRecoveryDialog) {
          setTimeout(() => {
            showRecoveryDialog.value = true
          }, 2000)
        }
      }
    } else if (authError.severity === 'medium') {
      // 中等严重度错误：显示通知
      addNotification({
        type: 'warning',
        title: '操作警告',
        message: userMessage,
        severity: 'medium',
        timeout: 8000,
        actions: authError.isRetryable ? [
          {
            label: '重试',
            handler: () => {
              // 触发重试逻辑
              console.log('用户选择重试')
            },
            variant: 'outline'
          }
        ] : undefined
      })
    } else {
      // 低严重度错误：显示信息提示
      addNotification({
        type: 'info',
        message: userMessage,
        severity: 'low',
        timeout: 5000
      })
    }
  }

  // 成功通知
  const showSuccess = (message: string, title?: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      severity: 'low',
      timeout: 3000
    })
  }

  // 信息通知
  const showInfo = (message: string, title?: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      severity: 'low',
      timeout: 5000
    })
  }

  // 警告通知
  const showWarning = (message: string, title?: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      severity: 'medium',
      timeout: 8000
    })
  }

  // 恢复对话框处理
  const handleRecovery = () => {
    showRecoveryDialog.value = false
    clearNotifications()

    // 尝试恢复认证状态
    authStore.forceSyncStates().then(() => {
      showSuccess('认证状态已恢复正常')
    }).catch(error => {
      handleAuthError(error, { action: 'recovery' })
    })
  }

  const handleRelogin = () => {
    showRecoveryDialog.value = false
    clearNotifications()
    navigateTo('/auth/login')
  }

  const handleDismissRecovery = () => {
    showRecoveryDialog.value = false
  }

  // 监听认证状态变化
  watch(
    () => authStore.lastError,
    (error) => {
      if (error) {
        handleAuthError(error)
      }
    }
  )

  // 监听认证状态
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (wasAuthenticated && !isAuthenticated) {
        // 用户意外登出
        showWarning('您已退出登录，请重新登录', '状态变化')
      } else if (!wasAuthenticated && isAuthenticated) {
        // 用户刚刚登录
        showSuccess('登录成功', '欢迎回来')
      }
    }
  )

  // 监听令牌即将过期
  const checkTokenExpiration = () => {
    if (authStore.isAuthenticated && authStore.isTokenExpiringSoon) {
      showWarning('您的登录即将过期，系统将自动刷新令牌', '令牌过期提醒')
    }
  }

  // 定期检查令牌状态
  let checkInterval: NodeJS.Timeout

  const startTokenCheck = () => {
    stopTokenCheck()
    checkInterval = setInterval(checkTokenExpiration, 60000) // 每分钟检查一次
  }

  const stopTokenCheck = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
    }
  }

  // 组件挂载时开始检查
  onMounted(() => {
    startTokenCheck()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopTokenCheck()
  })

  // 获取未读通知数量
  const unreadCount = computed(() => notifications.value.length)

  // 获取严重通知数量
  const criticalCount = computed(() =>
    notifications.value.filter(n => n.severity === 'critical').length
  )

  return {
    // 状态
    notifications: readonly(notifications),
    showRecoveryDialog: readonly(showRecoveryDialog),
    recoveryMessage: readonly(recoveryMessage),
    lastError: readonly(lastError),
    unreadCount,
    criticalCount,

    // 通知方法
    addNotification,
    removeNotification,
    clearNotifications,
    handleAuthError,

    // 便捷方法
    showSuccess,
    showInfo,
    showWarning,

    // 恢复对话框
    handleRecovery,
    handleRelogin,
    handleDismissRecovery,

    // 工具方法
    startTokenCheck,
    stopTokenCheck
  }
}