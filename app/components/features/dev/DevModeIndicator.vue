<template>
  <div
    v-if="showIndicator"
    class="dev-mode-indicator"
    :class="[
      `position-${position}`,
      `variant-${variant}`,
      { 'animate-pulse': animated }
    ]"
  >
    <div class="dev-mode-content">
      <div class="dev-mode-icon">
        <Icon name="i-mdi:developer-board" size="16" />
      </div>
      <div class="dev-mode-info">
        <div class="dev-mode-title">
          {{ title }}
        </div>
        <div v-if="showUser && currentUser" class="dev-mode-user">
          <Icon name="i-mdi:account" size="12" />
          {{ currentUser.name }} ({{ currentUser.email }})
        </div>
        <div v-if="showEnvironment" class="dev-mode-environment">
          <Icon name="i-mdi:server" size="12" />
          {{ environment }}
        </div>
      </div>
      <div v-if="closable" class="dev-mode-close" @click="closeIndicator">
        <Icon name="i-mdi:close" size="14" />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="showActions" class="dev-mode-actions">
      <button
        v-if="allowSwitch"
        class="dev-mode-action-btn"
        @click="openUserSwitcher"
      >
        <Icon name="i-mdi:account-switch" size="12" />
        切换用户
      </button>
      <button
        class="dev-mode-action-btn"
        @click="showSecurityInfo"
      >
        <Icon name="i-mdi:shield-check" size="12" />
        安全信息
      </button>
      <button
        class="dev-mode-action-btn"
        @click="openDevDocs"
      >
        <Icon name="i-mdi:book-open" size="12" />
        开发文档
      </button>
    </div>
  </div>

  <!-- 安全信息对话框 -->
  <Dialog v-model:visible="showSecurityDialog" header="安全检查信息" modal>
    <div class="security-info">
      <div v-if="securityReport" class="security-report">
        <div class="security-status" :class="{ 'safe': securityReport.overall.safe }">
          <Icon :name="securityReport.overall.safe ? 'i-mdi:check-circle' : 'i-mdi:alert'" />
          {{ securityReport.overall.safe ? '安全检查通过' : '安全检查失败' }}
        </div>

        <div v-if="!securityReport.overall.safe" class="security-warnings">
          <h4>警告信息：</h4>
          <p>{{ securityReport.overall.reason }}</p>

          <h5>建议：</h5>
          <ul>
            <li v-for="recommendation in securityReport.overall.recommendations" :key="recommendation">
              {{ recommendation }}
            </li>
          </ul>
        </div>

        <div class="security-details">
          <h5>详细检查结果：</h5>
          <div
            v-for="(check, name) in securityReport.checks"
            :key="name"
            class="security-check"
            :class="{ 'safe': check.safe }"
          >
            <Icon :name="check.safe ? 'i-mdi:check' : 'i-mdi:close'" />
            {{ formatCheckName(name) }}:
            {{ check.safe ? '通过' : '失败' }}
            <span v-if="!check.safe" class="check-reason">{{ check.reason }}</span>
          </div>
        </div>
      </div>

      <div v-else class="loading">
        <Icon name="i-mdi:loading" class="animate-spin" />
        正在获取安全检查信息...
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#app'
import { useAuthStore } from '~/stores/auth'

interface SecurityReport {
  timestamp: string
  environment: string
  checks: Record<string, any>
  overall: {
    safe: boolean
    reason?: string
    recommendations?: string[]
  }
}

interface Props {
  // 显示配置
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  variant?: 'badge' | 'banner' | 'compact'
  animated?: boolean
  closable?: boolean

  // 内容配置
  title?: string
  showUser?: boolean
  showEnvironment?: boolean
  showActions?: boolean
  allowSwitch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
  variant: 'badge',
  animated: true,
  closable: false,
  title: '开发环境',
  showUser: true,
  showEnvironment: true,
  showActions: true,
  allowSwitch: true
})

const emit = defineEmits<{
  close: []
  switchUser: []
}>()

// 响应式数据
const showIndicator = ref(true)
const showSecurityDialog = ref(false)
const securityReport = ref<SecurityReport | null>(null)

// 组合式函数
const config = useRuntimeConfig()
const authStore = useAuthStore()

// 计算属性
const currentUser = computed(() => authStore.user)
const environment = computed(() => config.public.isDevelopment ? 'Development' : 'Unknown')

// 检查是否应该显示指示器
const shouldShow = computed(() => {
  return (
    config.public.isDevelopment &&
    config.public.devAutoLoginEnabled &&
    showIndicator.value
  )
})

const showIndicator = computed({
  get: () => shouldShow.value,
  set: (value) => {
    if (value === false) {
      showIndicator.value = false
    }
  }
})

// 方法
const closeIndicator = () => {
  emit('close')
  showIndicator.value = false
}

const openUserSwitcher = () => {
  emit('switchUser')
  // 可以触发全局事件或导航到用户切换页面
}

const showSecurityInfo = async () => {
  try {
    // 调用安全检查API
    const response = await $fetch<SecurityReport>('/api/v1/dev/security-check')
    securityReport.value = response
    showSecurityDialog.value = true
  } catch (error) {
    console.error('获取安全检查信息失败:', error)
    // 显示错误信息
    securityReport.value = {
      timestamp: new Date().toISOString(),
      environment: environment.value,
      checks: {},
      overall: {
        safe: false,
        reason: '无法获取安全检查信息',
        recommendations: ['请检查网络连接或联系开发人员']
      }
    }
    showSecurityDialog.value = true
  }
}

const openDevDocs = () => {
  // 打开开发文档
  window.open('/docs/dev-auto-login', '_blank')
}

const formatCheckName = (name: string): string => {
  const nameMap: Record<string, string> = {
    environmentVariables: '环境变量检查',
    databaseConnection: '数据库连接检查',
    hostnameAndDomain: '主机域名检查',
    productionIndicators: '生产环境指标检查',
    fileSystemSafety: '文件系统安全检查'
  }
  return nameMap[name] || name
}

// 生命周期
onMounted(() => {
  // 自动获取安全检查信息
  if (props.showActions && config.public.isDevelopment) {
    showSecurityInfo()
  }
})
</script>

<style scoped>
.dev-mode-indicator {
  @apply z-50 fixed;
}

/* 位置样式 */
.position-top-left {
  @apply top-4 left-4;
}

.position-top-right {
  @apply top-4 right-4;
}

.position-bottom-left {
  @apply bottom-4 left-4;
}

.position-bottom-right {
  @apply bottom-4 right-4;
}

/* 变体样式 */
.variant-badge {
  @apply bg-orange-100 border border-orange-300 rounded-lg shadow-lg;
}

.variant-banner {
  @apply bg-orange-500 text-white w-full top-0 left-0 right-0 rounded-none;
}

.variant-compact {
  @apply bg-orange-100 border border-orange-300 rounded shadow;
}

.dev-mode-content {
  @apply flex items-center gap-2 p-3;
}

.dev-mode-icon {
  @apply text-orange-600 flex-shrink-0;
}

.dev-mode-info {
  @apply flex-1 min-w-0;
}

.dev-mode-title {
  @apply font-semibold text-orange-800 text-sm;
}

.dev-mode-user,
.dev-mode-environment {
  @apply text-orange-600 text-xs mt-1 flex items-center gap-1;
}

.dev-mode-close {
  @apply text-orange-600 hover:text-orange-800 cursor-pointer p-1 rounded;
}

.dev-mode-actions {
  @apply border-t border-orange-300 p-2 flex gap-2 flex-wrap;
}

.dev-mode-action-btn {
  @apply bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors;
}

/* 安全信息对话框样式 */
.security-info {
  @apply space-y-4;
}

.security-status {
  @apply flex items-center gap-2 text-lg font-semibold;
  @apply text-green-600;
}

.security-status.safe {
  @apply text-green-600;
}

.security-status:not(.safe) {
  @apply text-red-600;
}

.security-warnings {
  @apply bg-red-50 border border-red-200 rounded p-3;
}

.security-warnings h4,
.security-warnings h5 {
  @apply font-semibold text-red-800 mb-2;
}

.security-warnings ul {
  @apply list-disc list-inside text-red-700 space-y-1;
}

.security-details {
  @apply space-y-2;
}

.security-check {
  @apply flex items-start gap-2 p-2 rounded;
  @apply text-green-700 bg-green-50;
}

.security-check.safe {
  @apply text-green-700 bg-green-50;
}

.security-check:not(.safe) {
  @apply text-red-700 bg-red-50;
}

.check-reason {
  @apply text-xs block mt-1;
}

.loading {
  @apply flex items-center justify-center gap-2 py-4 text-gray-600;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .dev-mode-content {
    @apply p-2 gap-1;
  }

  .dev-mode-title {
    @apply text-xs;
  }

  .dev-mode-user,
  .dev-mode-environment {
    @apply hidden;
  }

  .dev-mode-actions {
    @apply flex-col gap-1;
  }

  .dev-mode-action-btn {
    @apply text-xs px-2 py-1;
  }
}
</style>