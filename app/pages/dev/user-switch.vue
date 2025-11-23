<template>
  <div class="dev-user-switch-page">
    <div class="container mx-auto py-8">
      <div class="max-w-2xl mx-auto">
        <!-- 页面标题 -->
        <div class="mb-8 text-center">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            开发环境用户切换
          </h1>
          <p class="text-gray-600">
            切换不同的开发用户以测试各种权限和功能
          </p>
        </div>

        <!-- 用户切换器组件 -->
        <UserSwitcher
          v-model:visible="showUserSwitcher"
          @user-switched="handleUserSwitched"
        />

        <!-- 快速切换按钮 -->
        <div class="quick-switch-section mb-8">
          <h2 class="text-xl font-semibold mb-4">快速切换</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="user in quickSwitchUsers"
              :key="user.id"
              class="quick-switch-card"
              @click="quickSwitchToUser(user)"
            >
              <Avatar
                :label="user.name.charAt(0)"
                size="xlarge"
                :style="getUserAvatarStyle(user.role)"
                class="mb-3"
              />
              <h3 class="font-semibold text-lg">{{ user.name }}</h3>
              <p class="text-gray-600 text-sm mb-2">{{ user.email }}</p>
              <Chip
                :label="user.role"
                :class="getRoleClass(user.role)"
                size="small"
              />
            </div>
          </div>
        </div>

        <!-- 使用说明 -->
        <div class="usage-guide">
          <h2 class="text-xl font-semibold mb-4">使用说明</h2>
          <div class="space-y-4">
            <Message severity="info" :closable="false">
              <div class="flex items-start gap-2">
                <Icon name="i-mdi:information" />
                <div>
                  <strong>功能说明：</strong>
                  <ul class="list-disc list-inside mt-2 text-sm space-y-1">
                    <li>仅限开发环境下使用，用于测试不同用户角色的功能</li>
                    <li>切换用户后将自动更新登录状态和权限</li>
                    <li>可以创建新的开发用户进行测试</li>
                    <li>所有操作仅影响当前开发环境</li>
                  </ul>
                </div>
              </div>
            </Message>

            <Message severity="warn" :closable="false">
              <div class="flex items-start gap-2">
                <Icon name="i-mdi:shield-alert" />
                <div>
                  <strong>安全提醒：</strong>
                  <ul class="list-disc list-inside mt-2 text-sm space-y-1">
                    <li>此功能仅在开发环境下可用，生产环境中已完全禁用</li>
                    <li>开发用户使用固定密码，请勿在生产环境中使用</li>
                    <li>定期清理开发用户数据，避免数据污染</li>
                    <li>切换用户后，某些页面可能需要刷新以显示正确状态</li>
                  </ul>
                </div>
              </div>
            </Message>
          </div>
        </div>

        <!-- 用户列表管理 -->
        <div class="user-management">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">开发用户管理</h2>
            <Button
              label="刷新列表"
              icon="i-mdi:refresh"
              size="small"
              variant="outlined"
              @click="loadUsers"
              :loading="loading"
            />
          </div>

          <DataTable
            :value="allUsers"
            :loading="loading"
            stripedRows
            responsiveLayout="scroll"
          >
            <Column field="name" header="用户名">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <Avatar
                    :label="data.name.charAt(0)"
                    size="small"
                    :style="getUserAvatarStyle(data.roles[0])"
                  />
                  <span>{{ data.name }}</span>
                </div>
              </template>
            </Column>

            <Column field="email" header="邮箱">
              <template #body="{ data }">
                <span class="text-sm text-gray-600">{{ data.email }}</span>
              </template>
            </Column>

            <Column field="roles" header="角色">
              <template #body="{ data }">
                <div class="flex gap-1">
                  <Chip
                    v-for="role in data.roles"
                    :key="role"
                    :label="role"
                    size="small"
                    :class="getRoleClass(role)"
                  />
                </div>
              </template>
            </Column>

            <Column field="isDevUser" header="开发用户">
              <template #body="{ data }">
                <Tag
                  :value="data.isDevUser ? '是' : '否'"
                  :severity="data.isDevUser ? 'success' : 'secondary'"
                />
              </template>
            </Column>

            <Column header="操作">
              <template #body="{ data }">
                <div class="flex gap-2">
                  <Button
                    label="切换"
                    icon="i-mdi:account-switch"
                    size="small"
                    @click="switchToUser(data)"
                    :disabled="currentUser?.id === data.id"
                  />
                  <Button
                    label="删除"
                    icon="i-mdi:delete"
                    size="small"
                    severity="danger"
                    variant="text"
                    @click="deleteUser(data)"
                    :disabled="currentUser?.id === data.id"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  isDevUser: boolean
}

// 页面元数据
definePageMeta({
  layout: 'default',
  title: '开发环境用户切换'
})

// 响应式数据
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()

const showUserSwitcher = ref(false)
const loading = ref(false)
const allUsers = ref<User[]>([])

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

const quickSwitchUsers = computed(() => {
  return allUsers.value.filter(user => user.isDevUser).slice(0, 6)
})

// 方法
const getUserAvatarStyle = (role: string): string => {
  const colors: Record<string, string> = {
    'ADMIN': '#ef4444',
    'MANAGER': '#3b82f6',
    'USER': '#10b981'
  }
  return `background-color: ${colors[role] || '#6366f1'}`
}

const getRoleClass = (role: string): string => {
  const roleClasses: Record<string, string> = {
    'ADMIN': 'bg-red-100 text-red-800',
    'MANAGER': 'bg-blue-100 text-blue-800',
    'USER': 'bg-green-100 text-green-800'
  }
  return roleClasses[role] || 'bg-gray-100 text-gray-800'
}

const loadUsers = async () => {
  try {
    loading.value = true
    const response = await $fetch<{ users: User[] }>('/api/v1/dev/users/available')
    allUsers.value = response.users
  } catch (error) {
    console.error('加载用户列表失败:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载用户列表',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const quickSwitchToUser = async (user: User) => {
  await switchToUser(user)
}

const switchToUser = async (user: User) => {
  if (currentUser.value?.id === user.id) {
    toast.add({
      severity: 'info',
      summary: '已是当前用户',
      detail: `您当前已经是用户 ${user.name}`,
      life: 3000
    })
    return
  }

  try {
    const response = await $fetch<{
      success: boolean
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

      // 刷新用户列表
      await loadUsers()
    }
  } catch (error) {
    console.error('用户切换失败:', error)
    toast.add({
      severity: 'error',
      summary: '切换失败',
      detail: error.message || '用户切换失败，请重试',
      life: 3000
    })
  }
}

const deleteUser = async (user: User) => {
  if (!confirm(`确定要删除用户 ${user.name} 吗？此操作不可恢复。`)) {
    return
  }

  try {
    await $fetch(`/api/v1/dev/users/${user.id}`, {
      method: 'DELETE'
    })

    toast.add({
      severity: 'success',
      summary: '删除成功',
      detail: `用户 ${user.name} 已删除`,
      life: 3000
    })

    // 刷新用户列表
    await loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: error.message || '删除用户失败，请重试',
      life: 3000
    })
  }
}

const handleUserSwitched = (user: User) => {
  // 用户切换成功后的处理
  console.log('用户切换成功:', user)
}

// 生命周期
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.dev-user-switch-page {
  @apply min-h-screen bg-gray-50;
}

.quick-switch-section {
  @apply bg-white rounded-lg shadow p-6;
}

.quick-switch-card {
  @apply bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer transition-all hover:border-blue-500 hover:shadow-md;
}

.quick-switch-card:hover {
  @apply transform -translate-y-1;
}

.usage-guide,
.user-management {
  @apply bg-white rounded-lg shadow p-6;
}

/* DataTable 样式优化 */
:deep(.p-datatable .p-datatable-thead > tr > th) {
  @apply bg-gray-50 text-gray-700 font-semibold;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  @apply bg-gray-50;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .quick-switch-section {
    @apply p-4;
  }

  .quick-switch-card {
    @apply p-4;
  }

  .usage-guide,
  .user-management {
    @apply p-4;
  }
}
</style>