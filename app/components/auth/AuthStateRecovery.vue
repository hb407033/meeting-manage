<template>
  <div v-if="visible" class="auth-state-recovery">
    <UCard class="auth-state-recovery__card">
      <template #header>
        <div class="auth-state-recovery__header">
          <Icon name="i-heroicons-shield-exclamation" class="auth-state-recovery__icon" />
          <h3 class="auth-state-recovery__title">登录状态异常</h3>
        </div>
      </template>

      <div class="auth-state-recovery__content">
        <p class="auth-state-recovery__message">
          {{ message }}
        </p>

        <div v-if="showDetails" class="auth-state-recovery__details">
          <UAccordion :items="detailsItems" />
        </div>

        <div class="auth-state-recovery__actions">
          <UButton
            variant="outline"
            :loading="isRetrying"
            @click="handleRetry"
          >
            <Icon name="i-heroicons-arrow-path" class="mr-2" />
            尝试恢复
          </UButton>

          <UButton
            variant="solid"
            color="primary"
            @click="handleRelogin"
          >
            <Icon name="i-heroicons-arrow-right-on-rectangle" class="mr-2" />
            重新登录
          </UButton>
        </div>

        <!-- 进度指示器 -->
        <div v-if="isRetrying" class="auth-state-recovery__progress">
          <UProgress :value="progress" />
          <p class="auth-state-recovery__progress-text">
            {{ progressText }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- 背景遮罩 -->
    <div v-if="overlay" class="auth-state-recovery__overlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { authStateManager } from '~/utils/auth-state-manager'

interface Props {
  visible: boolean
  message?: string
  overlay?: boolean
  showDetails?: boolean
  autoRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: '检测到您的登录状态可能异常，请选择处理方式。',
  overlay: true,
  showDetails: false,
  autoRetry: true
})

const emit = defineEmits<{
  recovered: []
  relogin: []
  dismiss: []
}>()

const authStore = useAuthStore()

const isRetrying = ref(false)
const progress = ref(0)
const progressText = ref('正在检查认证状态...')

const defaultMessage = '检测到您的登录状态可能异常，请选择处理方式。'

const message = computed(() => props.message || defaultMessage)

// 详细信息
const detailsItems = computed(() => [
  {
    label: '状态信息',
    content: `
      <div class="space-y-2">
        <div><strong>是否已认证:</strong> ${authStore.isAuthenticated ? '是' : '否'}</div>
        <div><strong>用户信息:</strong> ${authStore.user?.name || '无'}</div>
        <div><strong>令牌过期时间:</strong> ${formatTime(authStore.tokenExpiresAt)}</div>
        <div><strong>最后错误:</strong> ${authStore.lastError || '无'}</div>
      </div>
    `
  },
  {
    label: '可能原因',
    content: `
      <ul class="list-disc list-inside space-y-1">
        <li>网络连接问题导致令牌刷新失败</li>
        <li>多个标签页同时操作导致状态不一致</li>
        <li>浏览器存储被清理或损坏</li>
        <li>长时间未活动导致会话过期</li>
      </ul>
    `
  },
  {
    label: '建议操作',
    content: `
      <ol class="list-decimal list-inside space-y-1">
        <li>先尝试"尝试恢复"自动修复问题</li>
        <li>如果恢复失败，请选择"重新登录"</li>
        <li>检查网络连接是否正常</li>
        <li>如果问题持续存在，请联系技术支持</li>
      </ol>
    `
  }
])

// 格式化时间
const formatTime = (timestamp: number | null) => {
  if (!timestamp) return '无'
  return new Date(timestamp).toLocaleString()
}

// 尝试恢复状态
const handleRetry = async () => {
  isRetrying.value = true
  progress.value = 0
  progressText.value = '正在检查认证状态...'

  try {
    // 步骤1: 检查当前状态
    progress.value = 20
    progressText.value = '正在同步认证状态...'
    await authStore.forceSyncStates()

    // 步骤2: 检查令牌状态
    progress.value = 40
    progressText.value = '正在验证令牌有效性...'

    if (authStore.isAuthenticated && authStore.accessToken) {
      // 步骤3: 尝试刷新令牌（如果需要）
      progress.value = 60
      progressText.value = '正在刷新访问令牌...'

      if (authStore.isTokenExpiringSoon) {
        await authStore.refreshTokens()
      }

      // 步骤4: 验证最终状态
      progress.value = 80
      progressText.value = '正在验证最终状态...'

      if (authStore.isAuthenticated && authStore.user && authStore.accessToken) {
        progress.value = 100
        progressText.value = '状态恢复成功！'

        // 延迟一下再关闭
        setTimeout(() => {
          emit('recovered')
        }, 1000)

        return
      }
    }

    throw new Error('认证状态无法恢复')

  } catch (error) {
    console.error('恢复认证状态失败:', error)
    progress.value = 0
    progressText.value = `恢复失败: ${(error as Error).message}`

    // 显示错误状态
    setTimeout(() => {
      isRetrying.value = false
    }, 2000)
  }
}

// 重新登录
const handleRelogin = () => {
  emit('relogin')
}

// 自动重试
watch(
  () => props.visible && props.autoRetry,
  (shouldAutoRetry) => {
    if (shouldAutoRetry && !isRetrying.value) {
      // 延迟一下再自动重试
      setTimeout(() => {
        handleRetry()
      }, 1000)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.auth-state-recovery {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
}

.auth-state-recovery__card {
  @apply max-w-md w-full shadow-xl;
}

.auth-state-recovery__header {
  @apply flex items-center gap-3;
}

.auth-state-recovery__icon {
  @apply w-6 h-6 text-amber-500;
}

.auth-state-recovery__title {
  @apply text-lg font-semibold text-gray-900;
}

.auth-state-recovery__content {
  @apply space-y-4;
}

.auth-state-recovery__message {
  @apply text-gray-700;
}

.auth-state-recovery__details {
  @apply mt-4;
}

.auth-state-recovery__actions {
  @apply flex gap-3;
}

.auth-state-recovery__progress {
  @apply mt-4 space-y-2;
}

.auth-state-recovery__progress-text {
  @apply text-sm text-gray-600 text-center;
}

.auth-state-recovery__overlay {
  @apply fixed inset-0 bg-black/50 -z-10;
}
</style>