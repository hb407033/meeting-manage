<template>
  <Dialog
    v-model:visible="visible"
    :header="title"
    :style="{ width: '450px' }"
    :modal="true"
    :closable="false"
  >
    <div class="space-y-4">
      <!-- 警告图标和说明 -->
      <div class="flex items-start gap-3">
        <div class="p-3 bg-yellow-100 rounded-full flex-shrink-0">
          <i class="pi pi-exclamation-triangle text-yellow-600 text-xl"></i>
        </div>
        <div class="flex-1">
          <p class="text-gray-900 font-medium">{{ warningTitle }}</p>
          <p class="text-gray-600 text-sm mt-1">{{ warningDescription }}</p>
        </div>
      </div>

      <!-- 操作详情 -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="font-medium text-gray-900 mb-2">操作详情</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">操作类型：</span>
            <span class="font-mono">{{ operationType }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">目标对象：</span>
            <span>{{ targetDescription }}</span>
          </div>
          <div v-if="targetId" class="flex justify-between">
            <span class="text-gray-600">对象ID：</span>
            <span class="font-mono text-xs">{{ targetId }}</span>
          </div>
          <div v-if="additionalInfo" class="flex justify-between">
            <span class="text-gray-600">附加信息：</span>
            <span>{{ additionalInfo }}</span>
          </div>
        </div>
      </div>

      <!-- 影响说明 -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 class="font-medium text-red-900 mb-2 flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          影响说明
        </h4>
        <ul class="text-sm text-red-800 space-y-1">
          <li v-for="(impact, index) in impacts" :key="index" class="flex items-start gap-2">
            <span class="text-red-500 mt-1">•</span>
            <span>{{ impact }}</span>
          </li>
        </ul>
      </div>

      <!-- 确认原因 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          操作原因 <span class="text-red-500">*</span>
        </label>
        <Textarea
          v-model="reason"
          rows="3"
          placeholder="请输入执行此操作的原因..."
          class="w-full"
          :class="{ 'p-invalid': submitted && !reason.trim() }"
        />
        <small v-if="submitted && !reason.trim()" class="text-red-500">
          请输入操作原因
        </small>
      </div>

      <!-- 二次确认 -->
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="confirmed"
            inputId="confirm"
            :binary="true"
          />
          <label for="confirm" class="text-sm font-medium text-orange-900">
            我确认要执行此操作，并了解其后果
          </label>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button
          @click="handleCancel"
          label="取消"
          severity="secondary"
          outlined
        />
        <Button
          @click="handleConfirm"
          :label="confirmLabel"
          :icon="confirmIcon"
          :severity="confirmSeverity"
          :loading="loading"
          :disabled="!confirmed || !reason.trim()"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface SensitiveOperation {
  type: 'delete' | 'remove_role' | 'disable_user' | 'approve_request' | 'reject_request'
  targetDescription: string
  targetId?: string
  additionalInfo?: string
  reason?: string
  confirmed?: boolean
}

// Props
const props = withDefaults(defineProps<{
  visible: boolean
  operation: SensitiveOperation | null
}>(), {
  visible: false,
  operation: null
})

// Events
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [operation: SensitiveOperation]
  'cancel': []
}>()

// 响应式数据
const reason = ref('')
const confirmed = ref(false)
const submitted = ref(false)
const loading = ref(false)

// 计算属性
const title = computed(() => {
  if (!props.operation) return '敏感操作确认'

  const titles = {
    delete: '删除确认',
    remove_role: '移除角色确认',
    disable_user: '禁用用户确认',
    approve_request: '审批确认',
    reject_request: '拒绝确认'
  }

  return titles[props.operation.type] || '敏感操作确认'
})

const warningTitle = computed(() => {
  if (!props.operation) return ''

  const titles = {
    delete: '此操作不可恢复',
    remove_role: '将移除用户权限',
    disable_user: '将禁用用户账户',
    approve_request: '将批准权限申请',
    reject_request: '将拒绝权限申请'
  }

  return titles[props.operation.type] || '请仔细确认'
})

const warningDescription = computed(() => {
  if (!props.operation) return ''

  const descriptions = {
    delete: '删除后数据将永久丢失，无法恢复。',
    remove_role: '移除角色后，用户将失去相应的系统权限。',
    disable_user: '禁用后，用户将无法登录系统。',
    approve_request: '批准后，用户将获得相应权限。',
    reject_request: '拒绝后，用户需要重新申请。'
  }

  return descriptions[props.operation.type] || ''
})

const operationType = computed(() => {
  if (!props.operation) return ''

  const types = {
    delete: '删除',
    remove_role: '移除角色',
    disable_user: '禁用用户',
    approve_request: '审批通过',
    reject_request: '审批拒绝'
  }

  return types[props.operation.type] || '未知操作'
})

const confirmLabel = computed(() => {
  if (!props.operation) return '确认'

  const labels = {
    delete: '确认删除',
    remove_role: '确认移除',
    disable_user: '确认禁用',
    approve_request: '确认批准',
    reject_request: '确认拒绝'
  }

  return labels[props.operation.type] || '确认'
})

const confirmIcon = computed(() => {
  if (!props.operation) return 'pi pi-check'

  const icons = {
    delete: 'pi pi-trash',
    remove_role: 'pi pi-user-minus',
    disable_user: 'pi pi-ban',
    approve_request: 'pi pi-check-circle',
    reject_request: 'pi pi-times-circle'
  }

  return icons[props.operation.type] || 'pi pi-check'
})

const confirmSeverity = computed(() => {
  if (!props.operation) return 'primary'

  const severities = {
    delete: 'danger',
    remove_role: 'warning',
    disable_user: 'warning',
    approve_request: 'success',
    reject_request: 'warning'
  }

  return severities[props.operation.type] || 'primary'
})

const impacts = computed(() => {
  if (!props.operation) return []

  const impactMap = {
    delete: [
      '相关数据将被永久删除',
      '用户历史记录可能受影响',
      '此操作不可撤销'
    ],
    remove_role: [
      '用户将失去相应权限',
      '可能影响用户工作流程',
      '可以重新分配角色'
    ],
    disable_user: [
      '用户将无法登录系统',
      '用户会话将立即失效',
      '可以重新启用账户'
    ],
    approve_request: [
      '用户将获得申请的权限',
      '权限立即生效',
      '将发送通知给用户'
    ],
    reject_request: [
      '用户需要重新申请权限',
      '将发送拒绝原因给用户',
      '可以建议用户重新申请'
    ]
  }

  return impactMap[props.operation.type] || []
})

// 方法
const handleCancel = () => {
  resetForm()
  emit('cancel')
}

const handleConfirm = async () => {
  if (!props.operation || !confirmed.value || !reason.value.trim()) {
    submitted.value = true
    return
  }

  loading.value = true

  try {
    // 准备操作数据
    const operationData: SensitiveOperation = {
      ...props.operation,
      reason: reason.value.trim(),
      confirmed: true
    }

    // 延迟一点以显示加载状态
    await new Promise(resolve => setTimeout(resolve, 500))

    emit('confirm', operationData)
    resetForm()
  } catch (error) {
    console.error('Operation failed:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  reason.value = ''
  confirmed.value = false
  submitted.value = false
  loading.value = false
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// 监听operation变化
watch(() => props.operation, (newVal) => {
  if (newVal && newVal.reason) {
    reason.value = newVal.reason
  }
})
</script>

<style scoped>
:deep(.p-dialog .p-dialog-header) {
  @apply pb-4;
}

:deep(.p-checkbox .p-checkbox-box) {
  @apply w-4 h-4;
}
</style>