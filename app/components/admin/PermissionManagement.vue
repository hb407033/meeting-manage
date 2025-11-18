<template>
  <div class="permission-management">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-key"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalPermissions }}</div>
          <div class="stat-label">总权限数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalRoles }}</div>
          <div class="stat-label">总角色数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-user"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-shield"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeUsers }}</div>
          <div class="stat-label">活跃用户</div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions-bar">
      <div class="actions-left">
        <Button
          icon="pi pi-plus"
          label="创建权限"
          @click="showCreatePermissionDialog = true"
          :disabled="!canManagePermissions"
        />
        <Button
          icon="pi pi-plus"
          label="创建角色"
          severity="secondary"
          @click="showCreateRoleDialog = true"
          :disabled="!canManageRoles"
        />
      </div>

      <div class="actions-right">
        <IconField icon="pi pi-search">
          <InputText
            v-model="searchQuery"
            placeholder="搜索权限或角色..."
            @input="handleSearch"
          />
        </IconField>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="data-section">
      <TabView v-model:activeIndex="activeTab">
        <!-- 权限管理标签页 -->
        <TabPanel header="权限管理">
          <DataTable
            :value="permissions"
            :loading="loadingPermissions"
            :paginator="true"
            :rows="10"
            :globalFilterFields="['name', 'code', 'module', 'resource', 'action']"
            :globalFilter="searchQuery"
            responsiveLayout="scroll"
          >
            <template #empty>
              <div class="empty-message">
                <i class="pi pi-key empty-icon"></i>
                <p>暂无权限数据</p>
                <Button
                  label="创建权限"
                  icon="pi pi-plus"
                  @click="showCreatePermissionDialog = true"
                  :disabled="!canManagePermissions"
                />
              </div>
            </template>

            <Column field="name" header="权限名称" sortable>
              <template #body="{ data }">
                <div class="permission-name">
                  <span class="permission-title">{{ data.name }}</span>
                  <span class="permission-code">{{ data.code }}</span>
                </div>
              </template>
            </Column>

            <Column field="module" header="模块" sortable>
              <template #body="{ data }">
                <Tag :value="data.module || '通用'" severity="info" />
              </template>
            </Column>

            <Column field="resource" header="资源" sortable>
              <template #body="{ data }">
                <Tag v-if="data.resource" :value="data.resource" severity="secondary" />
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="action" header="操作" sortable>
              <template #body="{ data }">
                <Tag v-if="data.action" :value="data.action" severity="success" />
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="status" header="状态" sortable>
              <template #body="{ data }">
                <Tag
                  :value="data.isActive ? '启用' : '禁用'"
                  :severity="data.isActive ? 'success' : 'danger'"
                />
              </template>
            </Column>

            <Column header="操作">
              <template #body="{ data }">
                <div class="table-actions">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    rounded
                    @click="editPermission(data)"
                    :disabled="!canManagePermissions"
                    v-tooltip="'编辑权限'"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    rounded
                    severity="danger"
                    @click="deletePermission(data)"
                    :disabled="!canManagePermissions"
                    v-tooltip="'删除权限'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- 角色管理标签页 -->
        <TabPanel header="角色管理">
          <DataTable
            :value="roles"
            :loading="loadingRoles"
            :paginator="true"
            :rows="10"
            :globalFilterFields="['name', 'code', 'description']"
            :globalFilter="searchQuery"
            responsiveLayout="scroll"
          >
            <template #empty>
              <div class="empty-message">
                <i class="pi pi-users empty-icon"></i>
                <p>暂无角色数据</p>
                <Button
                  label="创建角色"
                  icon="pi pi-plus"
                  @click="showCreateRoleDialog = true"
                  :disabled="!canManageRoles"
                />
              </div>
            </template>

            <Column field="name" header="角色名称" sortable>
              <template #body="{ data }">
                <div class="role-name">
                  <span class="role-title">{{ data.name }}</span>
                  <Tag v-if="data.isSystem" value="系统" severity="warning" />
                </div>
              </template>
            </Column>

            <Column field="code" header="角色代码" sortable>
              <template #body="{ data }">
                <code class="role-code">{{ data.code }}</code>
              </template>
            </Column>

            <Column field="level" header="级别" sortable>
              <template #body="{ data }">
                <div class="role-level">
                  <ProgressBar
                    :value="(data.level / 100) * 100"
                    class="role-level-bar"
                  />
                  <span class="role-level-text">{{ data.level }}</span>
                </div>
              </template>
            </Column>

            <Column field="permissionCount" header="权限数量" sortable>
              <template #body="{ data }">
                <Badge :value="data.permissionCount" severity="info" />
              </template>
            </Column>

            <Column field="userCount" header="用户数量" sortable>
              <template #body="{ data }">
                <Badge :value="data.userCount" severity="secondary" />
              </template>
            </Column>

            <Column header="操作">
              <template #body="{ data }">
                <div class="table-actions">
                  <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    rounded
                    @click="viewRolePermissions(data)"
                    v-tooltip="'查看权限'"
                  />
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    rounded
                    @click="editRole(data)"
                    :disabled="!canManageRoles || data.isSystem"
                    v-tooltip="'编辑角色'"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    rounded
                    severity="danger"
                    @click="deleteRole(data)"
                    :disabled="!canManageRoles || data.isSystem"
                    v-tooltip="'删除角色'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </div>

    <!-- 创建权限对话框 -->
    <Dialog
      v-model:visible="showCreatePermissionDialog"
      header="创建权限"
      :style="{ width: '450px' }"
      modal
    >
      <form @submit.prevent="createPermission">
        <div class="form-field">
          <label for="permission-name">权限名称 *</label>
          <InputText
            id="permission-name"
            v-model="permissionForm.name"
            placeholder="请输入权限名称"
            required
          />
        </div>

        <div class="form-field">
          <label for="permission-code">权限代码 *</label>
          <InputText
            id="permission-code"
            v-model="permissionForm.code"
            placeholder="例如: user:create"
            required
          />
          <small class="form-help">
            建议格式：资源:操作，如 user:create, room:read
          </small>
        </div>

        <div class="form-field">
          <label for="permission-module">模块</label>
          <Dropdown
            id="permission-module"
            v-model="permissionForm.module"
            :options="moduleOptions"
            placeholder="请选择模块"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div class="form-field">
          <label for="permission-resource">资源</label>
          <InputText
            id="permission-resource"
            v-model="permissionForm.resource"
            placeholder="例如: user"
          />
        </div>

        <div class="form-field">
          <label for="permission-action">操作</label>
          <Dropdown
            id="permission-action"
            v-model="permissionForm.action"
            :options="actionOptions"
            placeholder="请选择操作"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div class="form-field">
          <label for="permission-description">描述</label>
          <Textarea
            id="permission-description"
            v-model="permissionForm.description"
            placeholder="请输入权限描述"
            rows="3"
          />
        </div>
      </form>

      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          @click="showCreatePermissionDialog = false"
        />
        <Button
          label="创建"
          @click="createPermission"
          :loading="creatingPermission"
        />
      </template>
    </Dialog>

    <!-- 创建角色对话框 -->
    <Dialog
      v-model:visible="showCreateRoleDialog"
      header="创建角色"
      :style="{ width: '500px' }"
      modal
    >
      <form @submit.prevent="createRole">
        <div class="form-field">
          <label for="role-name">角色名称 *</label>
          <InputText
            id="role-name"
            v-model="roleForm.name"
            placeholder="请输入角色名称"
            required
          />
        </div>

        <div class="form-field">
          <label for="role-code">角色代码 *</label>
          <InputText
            id="role-code"
            v-model="roleForm.code"
            placeholder="例如: MANAGER"
            required
          />
        </div>

        <div class="form-field">
          <label for="role-level">级别</label>
          <InputNumber
            id="role-level"
            v-model="roleForm.level"
            :min="0"
            :max="100"
            placeholder="权限级别，数值越大权限越高"
          />
          <small class="form-help">
            ADMIN: 100, MANAGER: 50, USER: 10
          </small>
        </div>

        <div class="form-field">
          <label for="role-description">描述</label>
          <Textarea
            id="role-description"
            v-model="roleForm.description"
            placeholder="请输入角色描述"
            rows="3"
          />
        </div>

        <div class="form-field">
          <label>分配权限</label>
          <MultiSelect
            v-model="roleForm.permissionIds"
            :options="availablePermissions"
            optionLabel="name"
            optionValue="id"
            placeholder="选择要分配的权限"
            :filter="true"
            :maxSelectedLabels="5"
          />
        </div>
      </form>

      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          @click="showCreateRoleDialog = false"
        />
        <Button
          label="创建"
          @click="createRole"
          :loading="creatingRole"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useAuth} from '~/composables/useAuth'
// 响应式数据
const activeTab = ref(0)
const loadingPermissions = ref(false)
const loadingRoles = ref(false)
const searchQuery = ref('')

// 对话框状态
const showCreatePermissionDialog = ref(false)
const showCreateRoleDialog = ref(false)
const creatingPermission = ref(false)
const creatingRole = ref(false)

// 数据状态
const permissions = ref([])
const roles = ref([])
const stats = ref({
  totalPermissions: 0,
  totalRoles: 0,
  totalUsers: 0,
  activeUsers: 0
})

// 表单数据
const permissionForm = ref({
  name: '',
  code: '',
  module: '',
  resource: '',
  action: '',
  description: ''
})

const roleForm = ref({
  name: '',
  code: '',
  level: 0,
  description: '',
  permissionIds: [] as string[]
})

// 选项数据
const moduleOptions = ref([
  { label: '用户管理', value: '用户管理' },
  { label: '权限管理', value: '权限管理' },
  { label: '会议室管理', value: '会议室管理' },
  { label: '预约管理', value: '预约管理' },
  { label: '数据分析', value: '数据分析' },
  { label: '系统管理', value: '系统管理' },
  { label: '审计日志', value: '审计日志' },
  { label: '设备管理', value: '设备管理' }
])

const actionOptions = ref([
  { label: '创建', value: 'create' },
  { label: '读取', value: 'read' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '审批', value: 'approve' },
  { label: '分配', value: 'assign' },
  { label: '查看数据', value: 'read-data' },
  { label: '导出', value: 'export' },
  { label: '管理', value: 'manage' }
])

const availablePermissions = ref([])

// 权限检查
const { user, isAuthenticated } = useAuth()
const { hasPermission } = usePermissions()

const canManagePermissions = computed(() => {
  if (!isAuthenticated.value || !user.value) return false
  return hasPermission(user.value.id, 'permission:manage')
})

const canManageRoles = computed(() => {
  if (!isAuthenticated.value || !user.value) return false
  return hasPermission(user.value.id, 'role:manage')
})

// 加载数据
const loadData = async () => {
  await Promise.all([
    loadPermissions(),
    loadRoles(),
    loadStats()
  ])
}

const loadPermissions = async () => {
  loadingPermissions.value = true
  try {
    const { data } = await $fetch('/api/v1/admin/permissions')
    permissions.value = data
  } catch (error) {
      console.error('加载权限数据失败:', error)
    } finally {
      loadingPermissions.value = false
    }
}

const loadRoles = async () => {
  loadingRoles.value = true
  try {
    const { data } = await $fetch('/api/v1/admin/roles')
    roles.value = data
  } catch (error) {
    console.error('加载角色数据失败:', error)
  } finally {
    loadingRoles.value = false
  }
}

const loadStats = async () => {
  try {
    const { data } = await $fetch('/api/v1/admin/organizations')
    stats.value = data.statistics
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadAvailablePermissions = async () => {
  try {
    const { data } = await $fetch('/api/v1/admin/permissions')
    availablePermissions.value = data
  } catch (error) {
    console.error('加载可用权限失败:', error)
  }
}

// 操作方法
const handleSearch = useDebounceFn(() => {
  // 搜索逻辑由DataTable的globalFilter处理
}, 300)

const createPermission = async () => {
  creatingPermission.value = true
  try {
    const response = await $fetch('/api/v1/admin/permissions', {
      method: 'POST',
      body: permissionForm.value
    })

    if (response.code === 201) {
      useToast().success('权限创建成功')
      showCreatePermissionDialog.value = false
      resetPermissionForm()
      await loadPermissions()
      await loadStats()
    }
  } catch (error) {
    console.error('创建权限失败:', error)
    useToast().error('创建权限失败')
  } finally {
    creatingPermission.value = false
  }
}

const createRole = async () => {
  creatingRole.value = true
  try {
    const response = await $fetch('/api/v1/admin/roles', {
      method: 'POST',
      body: roleForm.value
    })

    if (response.code === 201) {
      useToast().success('角色创建成功')
      showCreateRoleDialog.value = false
      resetRoleForm()
      await loadRoles()
    }
  } catch (error) {
    console.error('创建角色失败:', error)
    useToast().error('创建角色失败')
  } finally {
    creatingRole.value = false
  }
}

const editPermission = (permission) => {
  // 填充表单数据
  permissionForm.value = {
    name: permission.name,
    code: permission.code,
    module: permission.module,
    resource: permission.resource,
    action: permission.action,
    description: permission.description
  }
  showCreatePermissionDialog.value = true
}

const editRole = (role) => {
  // 填充表单数据
  roleForm.value = {
    name: role.name,
    code: role.code,
    level: role.level,
    description: role.description,
    permissionIds: role.permissions?.map(p => p.id) || []
  }
  showCreateRoleDialog.value = true
}

const deletePermission = async (permission) => {
  const confirmed = await useConfirm('确认删除', `确定要删除权限 "${permission.name}" 吗？此操作不可撤销。`)

  if (confirmed) {
    try {
      await $fetch(`/api/v1/admin/permissions/${permission.id}`, {
        method: 'DELETE'
      })
      useToast().success('权限删除成功')
      await loadPermissions()
    } catch (error) {
      console.error('删除权限失败:', error)
      useToast().error('删除权限失败')
    }
  }
}

const deleteRole = async (role) => {
  const confirmed = await useConfirm('确认删除', `确定要删除角色 "${role.name}" 吗？此操作不可撤销。`)

  if (confirmed) {
    try {
      await $fetch(`/api/v1/admin/roles/${role.id}`, {
        method: 'DELETE'
      })
      useToast().success('角色删除成功')
      await loadRoles()
    } catch (error) {
      console.error('删除角色失败:', error)
      useToast().error('删除角色失败')
    }
  }
}

const viewRolePermissions = (role) => {
  // 显示角色权限详情
  useToast().info(`角色 "${role.name}" 包含 ${role.permissionCount} 个权限`)
}

// 重置表单
const resetPermissionForm = () => {
  permissionForm.value = {
    name: '',
    code: '',
    module: '',
    resource: '',
    action: '',
    description: ''
  }
}

const resetRoleForm = () => {
  roleForm.value = {
    name: '',
    code: '',
    level: 0,
    description: '',
    permissionIds: []
  }
}

// 生命周期
onMounted(async () => {
  await loadData()
  await loadAvailablePermissions()
})
</script>

<style scoped>
.permission-management {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

/* 操作栏 */
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.actions-left,
.actions-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 数据区域 */
.data-section {
  background: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 权限名称样式 */
.permission-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.permission-title {
  font-weight: 500;
  color: #111827;
}

.permission-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* 角色名称样式 */
.role-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-title {
  font-weight: 500;
  color: #111827;
}

.role-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* 角色级别样式 */
.role-level {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
}

.role-level-bar {
  height: 0.5rem;
}

.role-level-text {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
}

/* 表格操作 */
.table-actions {
  display: flex;
  gap: 0.25rem;
}

/* 空状态 */
.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.25rem; /* py-9 (3rem * 0.75) */
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 2.25rem; /* text-3xl equivalent */
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-message p {
  margin: 0 0 1rem 0;
}

/* 表单样式 */
.form-field {
  margin-bottom: 1rem;
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

.text-muted {
  color: #9ca3af;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .actions-left,
  .actions-right {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>