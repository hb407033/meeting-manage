<template>
  <div class="permission-denied">
    <div class="denied-content">
      <div class="denied-icon">
        <i class="pi pi-lock"></i>
      </div>
      <h3 class="denied-title">权限不足</h3>
      <p class="denied-message">
        {{ message || '您没有足够的权限访问此功能。' }}
      </p>

      <!-- 权限详情 -->
      <div v-if="requiredPermissions && requiredPermissions.length > 0" class="required-permissions">
        <h4>所需权限：</h4>
        <div class="permission-list">
          <Chip
            v-for="permission in requiredPermissions"
            :key="permission"
            :label="permission"
            class="permission-chip"
          />
        </div>
      </div>

      <!-- 操作建议 -->
      <div class="suggested-actions">
        <div v-if="showContactAdmin" class="action-item">
          <i class="pi pi-headset"></i>
          <div>
            <div class="action-title">联系管理员</div>
            <div class="action-desc">如需访问权限，请联系系统管理员</div>
          </div>
        </div>

        <div v-if="showRequestAccess" class="action-item">
          <i class="pi pi-file-edit"></i>
          <div>
            <div class="action-title">申请权限</div>
            <div class="action-desc">提交权限申请，等待审批</div>
          </div>
        </div>

        <div v-if="showBackButton" class="action-item">
          <i class="pi pi-arrow-left"></i>
          <div>
            <div class="action-title">返回上级</div>
            <div class="action-desc">返回上一页面</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <Button
          v-if="showRequestAccess"
          label="申请权限"
          icon="pi pi-file-edit"
          @click="requestPermission"
          class="request-button"
        />

        <Button
          v-if="showBackButton"
          label="返回"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="goBack"
          class="back-button"
        />

        <Button
          v-if="showContactAdmin"
          label="联系管理员"
          icon="pi pi-headset"
          severity="info"
          @click="contactAdmin"
          class="contact-button"
        />
      </div>
    </div>

    <!-- 权限申请对话框 -->
    <Dialog
      v-model:visible="showRequestDialog"
      header="权限申请"
      :style="{ width: '500px' }"
      modal
    >
      <form @submit.prevent="submitPermissionRequest">
        <div class="form-field">
          <label for="requestReason">申请原因 *</label>
          <Textarea
            id="requestReason"
            v-model="permissionRequest.reason"
            placeholder="请详细说明您需要此权限的原因"
            rows="4"
            required
          />
          <small class="form-help">请说明申请权限的具体用途和工作需要</small>
        </div>

        <div class="form-field">
          <label for="requestDuration">期望使用期限</label>
          <Dropdown
            id="requestDuration"
            v-model="permissionRequest.duration"
            :options="durationOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="请选择使用期限"
          />
          <small class="form-help">根据工作需要选择合适的使用期限</small>
        </div>

        <div class="form-field">
          <label for="requestUrgency">紧急程度</label>
          <Dropdown
            id="requestUrgency"
            v-model="permissionRequest.urgency"
            :options="urgencyOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="请选择紧急程度"
          />
        </div>

        <div class="form-field">
          <label for="requestAttachments">相关附件 (可选)</label>
          <FileUpload
            id="requestAttachments"
            v-model="permissionRequest.attachments"
            mode="basic"
            :multiple="true"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            :fileLimit="3"
            :maxFileSize="5000000"
            chooseLabel="选择文件"
          />
          <small class="form-help">可上传相关证明文件，最多3个，每个不超过5MB</small>
        </div>
      </form>

      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          @click="showRequestDialog = false"
        />
        <Button
          label="提交申请"
          @click="submitPermissionRequest"
          :loading="submitting"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Props定义
interface Props {
  message?: string
  requiredPermissions?: string[]
  requiredRoles?: string[]
  showContactAdmin?: boolean
  showRequestAccess?: boolean
  showBackButton?: boolean
  redirectPath?: string
  compact?: boolean
}

// Props默认值
const props = withDefaults(defineProps<Props>(), {
  showContactAdmin: true,
  showRequestAccess: true,
  showBackButton: true,
  compact: false
})

// Emits定义
const emit = defineEmits<{
  'request-submitted': [request: any]
  'back-clicked': []
  'contact-admin': []
}>()

// 响应式数据
const showRequestDialog = ref(false)
const submitting = ref(false)

const permissionRequest = ref({
  reason: '',
  duration: '',
  urgency: '',
  attachments: []
})

// 选项数据
const durationOptions = ref([
  { label: '临时使用 (1周)', value: '1_week' },
  { label: '短期使用 (1个月)', value: '1_month' },
  { label: '中期使用 (3个月)', value: '3_months' },
  { label: '长期使用 (6个月)', value: '6_months' },
  { label: '永久使用', value: 'permanent' }
])

const urgencyOptions = ref([
  { label: '普通', value: 'normal' },
  { label: '紧急', value: 'urgent' },
  { label: '非常紧急', value: 'very_urgent' }
])

// 方法
const requestPermission = () => {
  showRequestDialog.value = true
}

const submitPermissionRequest = async () => {
  if (!permissionRequest.value.reason.trim()) {
    useToast().error('请填写申请原因')
    return
  }

  submitting.value = true
  try {
    const requestData = {
      permissions: props.requiredPermissions,
      roles: props.requiredRoles,
      reason: permissionRequest.value.reason,
      duration: permissionRequest.value.duration,
      urgency: permissionRequest.value.urgency,
      attachments: permissionRequest.value.attachments,
      requestedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentPath: window.location.pathname
    }

    const response = await $fetch('/api/v1/admin/permission-requests', {
      method: 'POST',
      body: requestData
    })

    if (response.code === 201) {
      useToast().success('权限申请提交成功，等待审批')
      showRequestDialog.value = false
      resetRequestForm()
      emit('request-submitted', response.data)
    }
  } catch (error) {
    console.error('提交权限申请失败:', error)
    useToast().error('提交权限申请失败')
  } finally {
    submitting.value = false
  }
}

const resetRequestForm = () => {
  permissionRequest.value = {
    reason: '',
    duration: '',
    urgency: '',
    attachments: []
  }
}

const goBack = () => {
  if (props.redirectPath) {
    navigateTo(props.redirectPath)
  } else {
    window.history.back()
  }
  emit('back-clicked')
}

const contactAdmin = () => {
  // 这里可以实现联系管理员的功能
  // 例如：发送邮件、打开聊天窗口、显示管理员联系方式等
  const adminEmail = 'admin@company.com'
  const subject = encodeURIComponent('权限申请咨询')
  const body = encodeURIComponent('您好，我想申请以下权限：\n' +
    (props.requiredPermissions?.join(', ') || props.requiredRoles?.join(', ') || ''))

  window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`)
  emit('contact-admin')
}
</script>

<style scoped>
.permission-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.denied-content {
  text-align: center;
  max-width: 500px;
  background: #ffffff;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.denied-icon {
  font-size: 4rem;
  color: #ef4444;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.denied-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
}

.denied-message {
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

/* 所需权限 */
.required-permissions {
  text-align: left;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.required-permissions h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 0.5rem 0;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.permission-chip {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 操作建议 */
.suggested-actions {
  text-align: left;
  margin-bottom: 1.5rem;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
}

.action-item:hover {
  background-color: #f8f9fa;
}

.action-item i {
  font-size: 1.25rem;
  color: #6b7280;
  width: 1.5rem;
  text-align: center;
}

.action-title {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.action-desc {
  color: #6b7280;
  font-size: 0.75rem;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.request-button {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
}

.back-button {
  border-color: #d1d5db;
}

.contact-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

/* 表单样式 */
.form-field {
  margin-bottom: 1.25rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

/* 紧凑模式 */
.permission-denied:deep(.compact) .denied-content {
  padding: 1.5rem;
  max-width: 400px;
}

.permission-denied:deep(.compact) .denied-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.permission-denied:deep(.compact) .denied-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.permission-denied:deep(.compact) .denied-message {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.permission-denied:deep(.compact) .suggested-actions {
  margin-bottom: 1rem;
}

.permission-denied:deep(.compact) .action-item {
  padding: 0.5rem;
}

.permission-denied:deep(.compact) .action-buttons {
  flex-direction: column;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .permission-denied {
    padding: 1rem;
  }

  .denied-content {
    padding: 1.5rem;
  }

  .denied-icon {
    font-size: 3rem;
  }

  .denied-title {
    font-size: 1.25rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .request-button,
  .back-button,
  .contact-button {
    width: 100%;
  }

  .required-permissions {
    padding: 0.75rem;
  }

  .permission-list {
    gap: 0.25rem;
  }

  .permission-chip {
    font-size: 0.6875rem;
  }
}
</style>