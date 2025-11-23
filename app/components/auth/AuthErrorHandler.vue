<template>
  <div
    v-if="visible && message"
    :class="[
      'auth-error-handler',
      `auth-error-handler--${type}`,
      `auth-error-handler--${severity}`
    ]"
  >
    <div class="auth-error-handler__content">
      <div class="auth-error-handler__icon">
        <Icon v-if="type === 'warning'" name="i-heroicons-exclamation-triangle" />
        <Icon v-else-if="type === 'error'" name="i-heroicons-x-circle" />
        <Icon v-else-if="type === 'info'" name="i-heroicons-information-circle" />
        <Icon v-else name="i-heroicons-check-circle" />
      </div>

      <div class="auth-error-handler__message">
        <h4 v-if="title" class="auth-error-handler__title">{{ title }}</h4>
        <p class="auth-error-handler__text">{{ message }}</p>

        <div v-if="actions.length > 0" class="auth-error-handler__actions">
          <UButton
            v-for="action in actions"
            :key="action.label"
            :variant="action.variant || 'outline'"
            :size="action.size || 'sm'"
            :loading="action.loading"
            :disabled="action.disabled"
            @click="action.handler"
          >
            {{ action.label }}
          </UButton>
        </div>
      </div>

      <button
        v-if="closable"
        class="auth-error-handler__close"
        @click="handleClose"
      >
        <Icon name="i-heroicons-x-mark" />
      </button>
    </div>

    <!-- 进度条（用于自动重试） -->
    <div
      v-if="showProgress && timeout > 0"
      class="auth-error-handler__progress"
    >
      <div
        class="auth-error-handler__progress-bar"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

interface AuthErrorHandlerAction {
  label: string
  handler: () => void | Promise<void>
  variant?: 'solid' | 'outline' | 'ghost' | 'soft'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
}

interface Props {
  visible: boolean
  title?: string
  message: string
  type?: 'info' | 'warning' | 'error' | 'success'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  closable?: boolean
  timeout?: number // 自动关闭时间（毫秒）
  actions?: AuthErrorHandlerAction[]
  showProgress?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  severity: 'medium',
  closable: true,
  timeout: 0,
  actions: () => [],
  showProgress: false
})

const emit = defineEmits<{
  close: []
  retry: []
  relogin: []
}>()

const authStore = useAuthStore()

// 进度条计算
const progress = ref(100)
const progressInterval = ref<NodeJS.Timeout | null>(null)

// 根据错误类型自动生成默认操作
const defaultActions = computed<AuthErrorHandlerAction[]>(() => {
  const actions = [...props.actions]

  // 如果是认证错误，提供重新登录选项
  if (props.type === 'error' && props.severity === 'high') {
    actions.push({
      label: '重新登录',
      handler: () => {
        emit('relogin')
        // 可以导航到登录页
        navigateTo('/auth/login')
      },
      variant: 'solid'
    })
  }

  // 如果是网络错误，提供重试选项
  if (props.type === 'warning' && props.message.includes('网络')) {
    actions.push({
      label: '重试',
      handler: () => {
        emit('retry')
      },
      variant: 'outline'
    })
  }

  return actions
})

// 监听可见性变化，处理自动关闭
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.timeout > 0) {
      startProgress()
    } else {
      stopProgress()
    }
  },
  { immediate: true }
)

const startProgress = () => {
  if (progressInterval.value) return

  const duration = props.timeout
  const interval = 50 // 更新频率
  const step = (interval / duration) * 100

  progress.value = 100
  progressInterval.value = setInterval(() => {
    progress.value -= step
    if (progress.value <= 0) {
      stopProgress()
      handleClose()
    }
  }, interval)
}

const stopProgress = () => {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
    progressInterval.value = null
  }
}

const handleClose = () => {
  emit('close')
}

onUnmounted(() => {
  stopProgress()
})
</script>

<style scoped>
.auth-error-handler {
  @apply relative rounded-lg border shadow-sm overflow-hidden;
  margin: 1rem 0;
}

/* 类型样式 */
.auth-error-handler--info {
  @apply border-blue-200 bg-blue-50;
}

.auth-error-handler--info .auth-error-handler__title {
  @apply text-blue-900;
}

.auth-error-handler--info .auth-error-handler__text {
  @apply text-blue-800;
}

.auth-error-handler--warning {
  @apply border-yellow-200 bg-yellow-50;
}

.auth-error-handler--warning .auth-error-handler__title {
  @apply text-yellow-900;
}

.auth-error-handler--warning .auth-error-handler__text {
  @apply text-yellow-800;
}

.auth-error-handler--error {
  @apply border-red-200 bg-red-50;
}

.auth-error-handler--error .auth-error-handler__title {
  @apply text-red-900;
}

.auth-error-handler--error .auth-error-handler__text {
  @apply text-red-800;
}

.auth-error-handler--success {
  @apply border-green-200 bg-green-50;
}

.auth-error-handler--success .auth-error-handler__title {
  @apply text-green-900;
}

.auth-error-handler--success .auth-error-handler__text {
  @apply text-green-800;
}

/* 严重程度样式 */
.auth-error-handler--critical {
  @apply border-red-300 bg-red-100;
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.1);
}

.auth-error-handler--high {
  @apply border-red-200;
}

.auth-error-handler--medium {
  @apply border-yellow-200;
}

.auth-error-handler--low {
  @apply border-blue-200;
}

.auth-error-handler__content {
  @apply flex items-start p-4 gap-3;
}

.auth-error-handler__icon {
  @apply flex-shrink-0 w-5 h-5 mt-0.5;
}

.auth-error-handler--info .auth-error-handler__icon {
  @apply text-blue-500;
}

.auth-error-handler--warning .auth-error-handler__icon {
  @apply text-yellow-500;
}

.auth-error-handler--error .auth-error-handler__icon {
  @apply text-red-500;
}

.auth-error-handler--success .auth-error-handler__icon {
  @apply text-green-500;
}

.auth-error-handler__message {
  @apply flex-1 min-w-0;
}

.auth-error-handler__title {
  @apply font-semibold text-sm mb-1;
}

.auth-error-handler__text {
  @apply text-sm;
}

.auth-error-handler__actions {
  @apply flex flex-wrap gap-2 mt-3;
}

.auth-error-handler__close {
  @apply flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors;
}

.auth-error-handler__progress {
  @apply h-1 bg-black/10;
}

.auth-error-handler__progress-bar {
  @apply h-full bg-current transition-all duration-75 ease-linear;
}

.auth-error-handler--info .auth-error-handler__progress-bar {
  @apply text-blue-500;
}

.auth-error-handler--warning .auth-error-handler__progress-bar {
  @apply text-yellow-500;
}

.auth-error-handler--error .auth-error-handler__progress-bar {
  @apply text-red-500;
}

.auth-error-handler--success .auth-error-handler__progress-bar {
  @apply text-green-500;
}
</style>