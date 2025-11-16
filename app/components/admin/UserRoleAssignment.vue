<template>
  <div class="user-role-assignment">
    <!-- 用户搜索和选择 -->
    <div class="user-search-section">
      <div class="search-header">
        <h3 class="section-title">选择用户</h3>
        <div class="search-controls">
          <IconField icon="pi pi-search">
            <InputText
              v-model="userSearchQuery"
              placeholder="搜索用户姓名或邮箱..."
              @input="handleUserSearch"
              class="user-search-input"
            />
          </IconField>
          <Dropdown
            v-model="selectedOrganization"
            :options="organizationOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="所有组织"
            @change="handleOrganizationFilter"
            class="org-filter-dropdown"
            showClear
          />
        </div>
      </div>

      <div class="user-list">
        <div v-if="userLoading" class="loading-state">
          <ProgressSpinner />
          <span>搜索用户中...</span>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="empty-state">
          <i class="pi pi-user-plus empty-icon"></i>
          <p>未找到用户</p>
          <small>请尝试调整搜索条件或组织筛选</small>
        </div>

        <div v-else class="user-cards">
          <div
            v-for="user in paginatedUsers"
            :key="user.id"
            class="user-card"
            :class="{ 'selected': selectedUser?.id === user.id }"
            @click="selectUser(user)"
          >
            <div class="user-avatar">
              <Avatar
                :image="user.avatar"
                :label="user.name?.charAt(0) || 'U'"
                class="user-avatar-img"
              />
            </div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-email">{{ user.email }}</div>
              <div class="user-org">{{ user.organization?.name }}</div>
            </div>
            <div class="user-current-roles">
              <div class="current-roles">
                <Chip
                  v-for="role in user.roles?.slice(0, 2)"
                  :key="role.id"
                  :label="role.name"
                  size="small"
                  class="role-chip"
                />
                <span v-if="user.roles?.length > 2" class="more-roles">
                  +{{ user.roles.length - 2 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <Paginator
          v-if="filteredUsers.length > itemsPerPage"
          :rows="itemsPerPage"
          :totalRecords="filteredUsers.length"
          @page="onPageChange"
          class="user-pagination"
        />
      </div>
    </div>

    <!-- 角色分配区域 -->
    <div v-if="selectedUser" class="role-assignment-section">
      <div class="assignment-header">
        <div class="selected-user-info">
          <h3 class="section-title">角色分配</h3>
          <div class="selected-user-details">
            <Avatar
              :image="selectedUser.avatar"
              :label="selectedUser.name?.charAt(0) || 'U'"
              size="large"
              class="selected-user-avatar"
            />
            <div>
              <div class="selected-user-name">{{ selectedUser.name }}</div>
              <div class="selected-user-email">{{ selectedUser.email }}</div>
              <div class="selected-user-org">{{ selectedUser.organization?.name }}</div>
            </div>
          </div>
        </div>
        <div class="assignment-actions">
          <Button
            label="保存分配"
            icon="pi pi-save"
            @click="saveUserRoleAssignments"
            :loading="saving"
            :disabled="!hasChanges"
          />
          <Button
            label="重置"
            icon="pi pi-refresh"
            severity="secondary"
            @click="resetRoleAssignments"
            :disabled="!hasChanges"
          />
        </div>
      </div>

      <!-- 当前角色 -->
      <div class="current-roles-section">
        <h4 class="subsection-title">当前角色</h4>
        <div class="current-roles-list">
          <div v-if="currentUserRoles.length === 0" class="no-roles">
            <i class="pi pi-info-circle"></i>
            <span>用户暂未分配任何角色</span>
          </div>
          <div v-else class="role-items">
            <div
              v-for="userRole in currentUserRoles"
              :key="userRole.id"
              class="role-item"
            >
              <div class="role-info">
                <div class="role-name">
                  {{ userRole.role.name }}
                  <Tag
                    v-if="userRole.role.isSystem"
                    value="系统"
                    severity="warning"
                    size="small"
                  />
                </div>
                <div class="role-meta">
                  <Badge :value="userRole.role.level" severity="info" size="small" />
                  <span v-if="userRole.assignedAt" class="assigned-date">
                    分配于 {{ formatDate(userRole.assignedAt) }}
                  </span>
                  <span v-if="userRole.expiresAt" class="expiry-date">
                    到期于 {{ formatDate(userRole.expiresAt) }}
                  </span>
                </div>
              </div>
              <div class="role-actions">
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  text
                  rounded
                  @click="editUserRole(userRole)"
                  v-tooltip="'编辑角色分配'"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  @click="removeUserRole(userRole)"
                  v-tooltip="'移除角色'"
                  :disabled="userRole.role.isSystem && userRole.role.level >= 100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 可分配角色 -->
      <div class="available-roles-section">
        <h4 class="subsection-title">可分配角色</h4>
        <div class="role-selection">
          <div class="role-grid">
            <div
              v-for="role in availableRoles"
              :key="role.id"
              class="role-card"
              :class="{
                'selected': selectedRoles.includes(role.id),
                'disabled': isRoleAssigned(role.id) || !canAssignRole(role)
              }"
              @click="toggleRoleSelection(role)"
            >
              <div class="role-card-header">
                <div class="role-card-info">
                  <div class="role-card-name">
                    {{ role.name }}
                    <Tag
                      v-if="role.isSystem"
                      value="系统"
                      severity="warning"
                      size="small"
                    />
                  </div>
                  <Badge :value="role.level" severity="info" size="small" />
                </div>
                <div class="role-selection-checkbox">
                  <Checkbox
                    :modelValue="selectedRoles.includes(role.id)"
                    :binary="true"
                    :disabled="isRoleAssigned(role.id) || !canAssignRole(role)"
                  />
                </div>
              </div>
              <div class="role-card-description">
                {{ role.description || '暂无描述' }}
              </div>
              <div class="role-card-meta">
                <span class="permission-count">
                  {{ role.permissionCount || 0 }} 个权限
                </span>
                <span v-if="isRoleAssigned(role.id)" class="already-assigned">
                  已分配
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 角色配置 -->
      <div v-if="selectedRoles.length > 0" class="role-configuration">
        <h4 class="subsection-title">角色配置</h4>
        <div class="config-form">
          <div class="form-field">
            <label for="expiresAt">到期时间 (可选)</label>
            <Calendar
              id="expiresAt"
              v-model="roleConfiguration.expiresAt"
              placeholder="选择到期时间"
              showTime
              hourFormat="24"
              :minDate="new Date()"
            />
            <small class="form-help">留空表示永不过期</small>
          </div>
          <div class="form-field">
            <label for="reason">分配原因</label>
            <Textarea
              id="reason"
              v-model="roleConfiguration.reason"
              placeholder="请说明角色分配的原因"
              rows="2"
            />
            <small class="form-help">用于审计和记录</small>
          </div>
        </div>
      </div>

      <!-- 权限预览 -->
      <div v-if="selectedRoles.length > 0" class="permission-preview">
        <h4 class="subsection-title">权限预览</h4>
        <div class="preview-content">
          <div class="preview-summary">
            <div class="summary-item">
              <span class="summary-label">选中角色:</span>
              <span class="summary-value">{{ selectedRoles.length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总权限数:</span>
              <span class="summary-value">{{ totalSelectedPermissions }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">最高权限级别:</span>
              <span class="summary-value">{{ highestSelectedLevel }}</span>
            </div>
          </div>
          <div class="permission-groups">
            <div
              v-for="module in selectedPermissionsByModule"
              :key="module.name"
              class="permission-module"
            >
              <h5 class="module-name">{{ module.name }}</h5>
              <div class="permission-list">
                <Chip
                  v-for="permission in module.permissions"
                  :key="permission.id"
                  :label="permission.name"
                  size="small"
                  class="permission-chip"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑角色分配对话框 -->
    <Dialog
      v-model:visible="showEditDialog"
      header="编辑角色分配"
      :style="{ width: '500px' }"
      modal
    >
      <div v-if="editingUserRole" class="edit-form">
        <div class="form-field">
          <label>角色</label>
          <div class="role-display">
            <span>{{ editingUserRole.role.name }}</span>
            <Tag
              v-if="editingUserRole.role.isSystem"
              value="系统"
              severity="warning"
              size="small"
            />
            <Badge :value="editingUserRole.role.level" severity="info" size="small" />
          </div>
        </div>
        <div class="form-field">
          <label for="editExpiresAt">到期时间</label>
          <Calendar
            id="editExpiresAt"
            v-model="editingUserRole.expiresAt"
            placeholder="选择到期时间"
            showTime
            hourFormat="24"
            :minDate="new Date()"
          />
        </div>
        <div class="form-field">
          <label for="editReason">分配原因</label>
          <Textarea
            id="editReason"
            v-model="editingUserRole.reason"
            placeholder="请说明角色分配的原因"
            rows="3"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          @click="showEditDialog = false"
        />
        <Button
          label="更新"
          @click="updateUserRoleAssignment"
          :loading="updating"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// Props定义
interface Props {
  onAssignmentChange?: (assignments: any[]) => void
  showOrganizationFilter?: boolean
  allowSystemRoleAssignment?: boolean
}

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  organization?: {
    id: string
    name: string
  }
  roles?: Array<{
    id: string
    name: string
    level: number
    isSystem: boolean
  }>
}

interface Role {
  id: string
  name: string
  code: string
  level: number
  isSystem: boolean
  description?: string
  permissionCount?: number
}

interface UserRole {
  id: string
  userId: string
  roleId: string
  role: Role
  assignedAt?: string
  expiresAt?: string
  reason?: string
  assignedBy?: string
}

// Props默认值
const props = withDefaults(defineProps<Props>(), {
  showOrganizationFilter: true,
  allowSystemRoleAssignment: false
})

// Emits定义
const emit = defineEmits<{
  'assignment-change': [assignments: UserRole[]]
  'user-select': [user: User]
}>()

// 响应式数据
const userSearchQuery = ref('')
const selectedOrganization = ref('')
const selectedUser = ref<User | null>(null)
const users = ref<User[]>([])
const organizations = ref<any[]>([])
const roles = ref<Role[]>([])
const currentUserRoles = ref<UserRole[]>([])
const selectedRoles = ref<string[]>([])
const originalSelectedRoles = ref<string[]>([])

const userLoading = ref(false)
const saving = ref(false)
const updating = ref(false)

const showEditDialog = ref(false)
const editingUserRole = ref<UserRole | null>(null)

// 角色配置
const roleConfiguration = ref({
  expiresAt: null as Date | null,
  reason: ''
})

// 分页
const currentPage = ref(0)
const itemsPerPage = ref(8)

// 计算属性
const organizationOptions = computed(() => {
  return [
    { label: '所有组织', value: '' },
    ...organizations.value.map(org => ({
      label: org.name,
      value: org.id
    }))
  ]
})

const filteredUsers = computed(() => {
  let filtered = users.value

  // 搜索过滤
  if (userSearchQuery.value) {
    const query = userSearchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }

  // 组织过滤
  if (selectedOrganization.value) {
    filtered = filtered.filter(user =>
      user.organization?.id === selectedOrganization.value
    )
  }

  return filtered
})

const paginatedUsers = computed(() => {
  const start = currentPage.value * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUsers.value.slice(start, end)
})

const availableRoles = computed(() => {
  return roles.value.filter(role =>
    props.allowSystemRoleAssignment || !role.isSystem
  )
})

const hasChanges = computed(() => {
  return JSON.stringify(selectedRoles.value.sort()) !==
         JSON.stringify(originalSelectedRoles.value.sort())
})

const totalSelectedPermissions = computed(() => {
  const permissionSet = new Set<string>()
  selectedRoles.value.forEach(roleId => {
    const role = roles.value.find(r => r.id === roleId)
    if (role?.permissionCount) {
      permissionSet.add(roleId)
    }
  })
  return permissionSet.size
})

const highestSelectedLevel = computed(() => {
  if (selectedRoles.value.length === 0) return 0

  const levels = selectedRoles.value.map(roleId => {
    const role = roles.value.find(r => r.id === roleId)
    return role?.level || 0
  })

  return Math.max(...levels)
})

const selectedPermissionsByModule = computed(() => {
  // 这里应该根据选中的角色获取权限并按模块分组
  // 暂时返回模拟数据
  const mockPermissions = [
    { id: '1', name: '用户查看', module: '用户管理' },
    { id: '2', name: '用户创建', module: '用户管理' },
    { id: '3', name: '权限查看', module: '权限管理' },
    { id: '4', name: '权限分配', module: '权限管理' }
  ]

  const moduleGroups: Record<string, any[]> = {}
  mockPermissions.forEach(permission => {
    if (!moduleGroups[permission.module]) {
      moduleGroups[permission.module] = []
    }
    moduleGroups[permission.module].push(permission)
  })

  return Object.entries(moduleGroups).map(([name, permissions]) => ({
    name,
    permissions
  }))
})

// 方法
const handleUserSearch = useDebounceFn(() => {
  currentPage.value = 0
}, 300)

const handleOrganizationFilter = () => {
  currentPage.value = 0
}

const onPageChange = (event: any) => {
  currentPage.value = event.page
}

const selectUser = async (user: User) => {
  selectedUser.value = user
  await loadUserRoles(user.id)
  resetRoleSelection()
  emit('user-select', user)
}

const loadUsers = async () => {
  userLoading.value = true
  try {
    const { data } = await $fetch('/api/v1/users/filtered', {
      query: {
        organizationId: selectedOrganization.value || undefined
      }
    })
    users.value = data
  } catch (error) {
    console.error('加载用户数据失败:', error)
    useToast().error('加载用户数据失败')
  } finally {
    userLoading.value = false
  }
}

const loadOrganizations = async () => {
  try {
    const { data } = await $fetch('/api/v1/organizations')
    organizations.value = data
  } catch (error) {
    console.error('加载组织数据失败:', error)
  }
}

const loadRoles = async () => {
  try {
    const { data } = await $fetch('/api/v1/admin/roles')
    roles.value = data
  } catch (error) {
    console.error('加载角色数据失败:', error)
    useToast().error('加载角色数据失败')
  }
}

const loadUserRoles = async (userId: string) => {
  try {
    const { data } = await $fetch(`/api/v1/admin/user-roles/${userId}`)
    currentUserRoles.value = data
    selectedRoles.value = data.map((ur: UserRole) => ur.roleId)
    originalSelectedRoles.value = [...selectedRoles.value]
  } catch (error) {
    console.error('加载用户角色失败:', error)
    useToast().error('加载用户角色失败')
  }
}

const isRoleAssigned = (roleId: string) => {
  return currentUserRoles.value.some(ur => ur.roleId === roleId)
}

const canAssignRole = (role: Role) => {
  // 检查当前用户是否有权限分配该角色
  // 这里需要实现权限检查逻辑
  return true
}

const toggleRoleSelection = (role: Role) => {
  if (isRoleAssigned(role.id) || !canAssignRole(role)) {
    return
  }

  const index = selectedRoles.value.indexOf(role.id)
  if (index > -1) {
    selectedRoles.value.splice(index, 1)
  } else {
    selectedRoles.value.push(role.id)
  }
}

const resetRoleSelection = () => {
  selectedRoles.value = [...originalSelectedRoles.value]
  roleConfiguration.value = {
    expiresAt: null,
    reason: ''
  }
}

const resetRoleAssignments = () => {
  resetRoleSelection()
}

const saveUserRoleAssignments = async () => {
  if (!selectedUser.value) return

  saving.value = true
  try {
    const assignments = selectedRoles.value.map(roleId => ({
      userId: selectedUser.value!.id,
      roleId,
      expiresAt: roleConfiguration.value.expiresAt?.toISOString(),
      reason: roleConfiguration.value.reason
    }))

    const response = await $fetch('/api/v1/admin/user-roles/assign-batch', {
      method: 'POST',
      body: {
        userId: selectedUser.value.id,
        assignments,
        reason: roleConfiguration.value.reason
      }
    })

    if (response.code === 200) {
      useToast().success('角色分配保存成功')
      await loadUserRoles(selectedUser.value.id)
      emit('assignment-change', currentUserRoles.value)
    }
  } catch (error) {
    console.error('保存角色分配失败:', error)
    useToast().error('保存角色分配失败')
  } finally {
    saving.value = false
  }
}

const editUserRole = (userRole: UserRole) => {
  editingUserRole.value = { ...userRole }
  showEditDialog.value = true
}

const updateUserRoleAssignment = async () => {
  if (!editingUserRole.value) return

  updating.value = true
  try {
    const response = await $fetch(`/api/v1/admin/user-roles/${editingUserRole.value.id}`, {
      method: 'PUT',
      body: {
        expiresAt: editingUserRole.value.expiresAt?.toISOString(),
        reason: editingUserRole.value.reason
      }
    })

    if (response.code === 200) {
      useToast().success('角色分配更新成功')
      showEditDialog.value = false
      await loadUserRoles(selectedUser.value!.id)
    }
  } catch (error) {
    console.error('更新角色分配失败:', error)
    useToast().error('更新角色分配失败')
  } finally {
    updating.value = false
  }
}

const removeUserRole = async (userRole: UserRole) => {
  const confirmed = await useConfirm(
    '确认移除角色',
    `确定要移除用户的 "${userRole.role.name}" 角色吗？`
  )

  if (confirmed) {
    try {
      await $fetch(`/api/v1/admin/user-roles/${userRole.id}`, {
        method: 'DELETE'
      })

      useToast().success('角色移除成功')
      await loadUserRoles(selectedUser.value!.id)
    } catch (error) {
      console.error('移除角色失败:', error)
      useToast().error('移除角色失败')
    }
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadOrganizations(),
    loadRoles()
  ])
})

// Watch外部变化
watch(() => selectedOrganization.value, () => {
  loadUsers()
})
</script>

<style scoped>
.user-role-assignment {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
}

/* 用户搜索区域 */
.user-search-section {
  background: #ffffff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  max-height: 800px;
  display: flex;
  flex-direction: column;
}

.search-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.search-controls {
  display: flex;
  gap: 0.75rem;
}

.user-search-input {
  flex: 1;
}

.org-filter-dropdown {
  min-width: 120px;
}

/* 用户列表 */
.user-list {
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.user-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-card:hover {
  background-color: #f8f9fa;
  border-color: #d1d5db;
}

.user-card.selected {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

.user-avatar {
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.user-email {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.125rem;
}

.user-org {
  font-size: 0.75rem;
  color: #9ca3af;
}

.user-current-roles {
  flex-shrink: 0;
}

.current-roles {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.role-chip {
  margin: 0;
}

.more-roles {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.user-pagination {
  margin-top: 1rem;
}

/* 角色分配区域 */
.role-assignment-section {
  background: #ffffff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  max-height: 800px;
  overflow-y: auto;
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.selected-user-info {
  flex: 1;
}

.selected-user-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
}

.selected-user-avatar {
  flex-shrink: 0;
}

.selected-user-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.selected-user-email {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.125rem;
}

.selected-user-org {
  color: #9ca3af;
  font-size: 0.75rem;
}

.assignment-actions {
  display: flex;
  gap: 0.75rem;
}

/* 当前角色 */
.current-roles-section,
.available-roles-section,
.role-configuration,
.permission-preview {
  margin-bottom: 2rem;
}

.subsection-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

.current-roles-list {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
}

.no-roles {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-style: italic;
}

.role-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.role-info {
  flex: 1;
}

.role-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.assigned-date,
.expiry-date {
  font-family: monospace;
}

.role-actions {
  display: flex;
  gap: 0.25rem;
}

/* 可分配角色 */
.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.role-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.role-card:hover:not(.disabled) {
  background-color: #f8f9fa;
  border-color: #d1d5db;
}

.role-card.selected {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

.role-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f9fafb;
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.role-card-info {
  flex: 1;
}

.role-card-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-card-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.role-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.permission-count {
  color: #6b7280;
}

.already-assigned {
  color: #059669;
  font-weight: 500;
}

/* 角色配置 */
.config-form {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
}

.form-field {
  margin-bottom: 1rem;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

/* 权限预览 */
.preview-content {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
}

.preview-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.permission-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.permission-module {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
}

.module-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.permission-chip {
  margin: 0;
  font-size: 0.75rem;
}

/* 编辑对话框 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .user-role-assignment {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .role-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .user-role-assignment {
    gap: 0.5rem;
  }

  .search-controls {
    flex-direction: column;
  }

  .assignment-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .assignment-actions {
    justify-content: flex-start;
  }

  .role-grid {
    grid-template-columns: 1fr;
  }

  .preview-summary {
    flex-direction: column;
    gap: 1rem;
  }

  .summary-item {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>