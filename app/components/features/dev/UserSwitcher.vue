<template>
  <Dialog
    v-model:visible="visible"
    header="开发环境用户切换"
    modal
    :style="{ width: '500px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="user-switcher">
      <!-- 当前用户信息 -->
      <div v-if="currentUser" class="current-user-section">
        <h3 class="section-title">当前用户</h3>
        <div class="user-card current-user">
          <div class="user-avatar">
            <Avatar
              :label="currentUser.name.charAt(0)"
              class="mr-3"
              size="large"
              style="background-color: #f59e0b"
            />
          </div>
          <div class="user-info">
            <div class="user-name">{{ currentUser.name }}</div>
            <div class="user-email">{{ currentUser.email }}</div>
            <div class="user-roles">
              <Chip
                v-for="role in currentUser.roles"
                :key="role"
                :label="role"
                size="small"
                class="mr-1"
                :class="getRoleClass(role)"
              />
            </div>
          </div>
          <div class="user-status">
            <Icon name="i-mdi:check-circle" class="text-green-500" />
            <span class="text-sm text-green-600">已登录</span>
          </div>
        </div>
      </div>

      <!-- 可切换用户列表 -->
      <div class="available-users-section">
        <h3 class="section-title">可切换用户</h3>
        <div v-if="loading" class="loading-state">
          <Icon name="i-mdi:loading" class="animate-spin" />
          <span>加载用户列表...</span>
        </div>

        <div v-else-if="availableUsers.length === 0" class="empty-state">
          <Icon name="i-mdi:account-off" />
          <span>暂无可切换用户</span>
          <Button
            label="刷新"
            icon="i-mdi:refresh"
            size="small"
            variant="text"
            @click="loadAvailableUsers"
          />
        </div>

        <div v-else class="user-list">
          <div
            v-for="user in availableUsers"
            :key="user.id"
            class="user-card"
            :class="{ 'switching': switchingTo === user.id }"
            @click="switchToUser(user)"
          >
            <div class="user-avatar">
              <Avatar
                :label="user.name.charAt(0)"
                class="mr-3"
                size="large"
                style="background-color: #6366f1"
              />
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-email">{{ user.email }}</div>
              <div class="user-roles">
                <Chip
                  v-for="role in user.roles"
                  :key="role"
                  :label="role"
                  size="small"
                  class="mr-1"
                  :class="getRoleClass(role)"
                />
              </div>
            </div>
            <div class="switch-action">
              <Button
                label="切换"
                icon="i-mdi:account-switch"
                size="small"
                :loading="switchingTo === user.id"
                @click.stop="switchToUser(user)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 安全警告 -->
      <Message
        severity="warn"
        :closable="false"
        class="security-warning"
      >
        <div class="flex items-start gap-2">
          <Icon name="i-mdi:shield-alert" />
          <div>
            <strong>安全提醒：</strong>
            <p class="text-sm mt-1">
              用户切换功能仅限开发环境使用，用于测试不同角色的权限和功能。请勿在生产环境中使用此功能。
            </p>
          </div>
        </div>
      </Message>

      <!-- 操作按钮 -->
      <div class="dialog-footer">
        <Button
          label="创建新用户"
          icon="i-mdi:account-plus"
          variant="outlined"
          @click="showCreateUserDialog = true"
        />
        <Button
          label="关闭"
          icon="i-mdi:close"
          variant="text"
          @click="closeDialog"
        />
      </div>
    </div>

    <!-- 创建用户对话框 -->
    <Dialog
      v-model:visible="showCreateUserDialog"
      header="创建开发用户"
      modal
      :style="{ width: '400px' }"
    >
      <form @submit.prevent="createNewUser">
        <div class="space-y-4">
          <div>
            <label for="userName" class="block text-sm font-medium mb-1">用户名</label>
            <InputText
              id="userName"
              v-model="newUser.name"
              :class="{ 'p-invalid': errors.name }"
              placeholder="请输入用户名"
            />
            <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
          </div>

          <div>
            <label for="userEmail" class="block text-sm font-medium mb-1">邮箱</label>
            <InputText
              id="userEmail"
              v-model="newUser.email"
              :class="{ 'p-invalid': errors.email }"
              placeholder="请输入邮箱"
              type="email"
            />
            <small v-if="errors.email" class="text-red-500">{{ errors.email }}</small>
          </div>

          <div>
            <label for="userRole" class="block text-sm font-medium mb-1">角色</label>
            <Dropdown
              id="userRole"
              v-model="newUser.role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
              placeholder="选择角色"
              :class="{ 'p-invalid': errors.role }"
            />
            <small v-if="errors.role" class="text-red-500">{{ errors.role }}</small>
          </div>
        </div>

        <div class="dialog-footer mt-6">
          <Button
            label="取消"
            icon="i-mdi:close"
            variant="text"
            @click="showCreateUserDialog = false"
          />
          <Button
            label="创建"
            icon="i-mdi:account-plus"
            type="submit"
            :loading="creatingUser"
          />
        </div>
      </form>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from 'primevue/usetoast'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  isDevUser: boolean
}

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'user-switched': [user: User]
}>()

// 响应式数据
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const switchingTo = ref<string | null>(null)
const availableUsers = ref<User[]>([])
const showCreateUserDialog = ref(false)
const creatingUser = ref(false)

const newUser = ref({
  name: '',
  email: '',
  role: 'USER'
})

const errors = ref<Record<string, string>>({})

const roleOptions = [
  { label: '管理员 (ADMIN)', value: 'ADMIN' },
  { label: '经理 (MANAGER)', value: 'MANAGER' },
  { label: '普通用户 (USER)', value: 'USER' }
]

// 计算属性
const currentUser = computed<User | null>(() => {
  if (!authStore.user) return null

  return {
    id: authStore.user.id,
    name: authStore.user.name,
    email: authStore.user.email,
    roles: authStore.user.roles || [],
    isDevUser: authStore.user.isDevUser || false
  }
})

// 方法
const getRoleClass = (role: string): string => {
  const roleClasses: Record<string, string> = {
    'ADMIN': 'bg-red-100 text-red-800',
    'MANAGER': 'bg-blue-100 text-blue-800',
    'USER': 'bg-green-100 text-green-800'
  }
  return roleClasses[role] || 'bg-gray-100 text-gray-800'
}

const loadAvailableUsers = async () => {
  try {
    loading.value = true
    const response = await $fetch<{ users: User[] }>('/api/v1/dev/users/available')
    availableUsers.value = response.users.filter(user =>
      !currentUser.value || user.id !== currentUser.value.id
    )
  } catch (error) {
    console.error('加载可用用户失败:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载可用用户列表',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const switchToUser = async (user: User) => {
  try {
    switchingTo.value = user.id

    const response = await $fetch<{
      success: boolean
      tokens: { accessToken: string; refreshToken: string }
      user: User
    }>('/api/v1/dev/users/switch', {
      method: 'POST',
      body: { userId: user.id }
    })

    if (response.success) {
      // 更新认证状态
      await authStore.refreshAuth()

      toast.add({
        severity: 'success',
        summary: '切换成功',
        detail: `已切换到用户 ${user.name}`,
        life: 3000
      })

      emit('user-switched', user)
      closeDialog()
    }
  } catch (error) {
    console.error('用户切换失败:', error)
    toast.add({
      severity: 'error',
      summary: '切换失败',
      detail: error.message || '用户切换失败，请重试',
      life: 3000
    })
  } finally {
    switchingTo.value = null
  }
}

const validateNewUser = (): boolean => {
  errors.value = {}

  if (!newUser.value.name.trim()) {
    errors.value.name = '用户名不能为空'
  }

  if (!newUser.value.email.trim()) {
    errors.value.email = '邮箱不能为空'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.value.email)) {
    errors.value.email = '邮箱格式不正确'
  }

  if (!newUser.value.role) {
    errors.value.role = '请选择角色'
  }

  return Object.keys(errors.value).length === 0
}

const createNewUser = async () => {
  if (!validateNewUser()) {
    return
  }

  try {
    creatingUser.value = true

    const response = await $fetch<{
      success: boolean
      user: User
    }>('/api/v1/dev/users', {
      method: 'POST',
      body: newUser.value
    })

    if (response.success) {
      toast.add({
        severity: 'success',
        summary: '创建成功',
        detail: `用户 ${response.user.name} 创建成功`,
        life: 3000
      })

      // 重置表单
      newUser.value = { name: '', email: '', role: 'USER' }
      showCreateUserDialog.value = false

      // 重新加载用户列表
      await loadAvailableUsers()
    }
  } catch (error) {
    console.error('创建用户失败:', error)
    toast.add({
      severity: 'error',
      summary: '创建失败',
      detail: error.message || '用户创建失败，请重试',
      life: 3000
    })
  } finally {
    creatingUser.value = false
  }
}

const closeDialog = () => {
  visible.value = false
}

// 生命周期
onMounted(() => {
  if (visible.value) {
    loadAvailableUsers()
  }
})

// 监听visible变化
watch(visible, (newValue) => {
  if (newValue) {
    loadAvailableUsers()
  }
})
</script>

<style scoped>
.user-switcher {
  @apply space-y-6;
}

.section-title {
  @apply text-lg font-semibold text-gray-800 mb-4;
}

.current-user-section {
  @apply space-y-2;
}

.available-users-section {
  @apply space-y-2;
}

.user-card {
  @apply flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50;
}

.user-card.current-user {
  @apply bg-green-50 border-green-200;
}

.user-card.switching {
  @apply opacity-50 cursor-not-allowed;
}

.user-avatar {
  @apply flex-shrink-0;
}

.user-info {
  @apply flex-1 min-w-0;
}

.user-name {
  @apply font-medium text-gray-900;
}

.user-email {
  @apply text-sm text-gray-600;
}

.user-roles {
  @apply flex flex-wrap gap-1 mt-1;
}

.user-status {
  @apply flex items-center gap-1 flex-shrink-0;
}

.switch-action {
  @apply flex-shrink-0;
}

.loading-state,
.empty-state {
  @apply flex flex-col items-center justify-center py-8 text-gray-500 gap-2;
}

.user-list {
  @apply space-y-2 max-h-60 overflow-y-auto;
}

.security-warning {
  @apply mt-4;
}

.dialog-footer {
  @apply flex justify-end gap-2 mt-6;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .user-card {
    @apply flex-col items-start gap-2;
  }

  .switch-action {
    @apply w-full;
  }

  .user-avatar {
    @apply self-center;
  }
}
</style>