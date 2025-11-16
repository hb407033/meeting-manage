<template>
  <AdminLayout>
    <template #page-actions>
      <div class="page-actions">
        <Button
          label="导出权限"
          icon="pi pi-download"
          severity="secondary"
          @click="exportPermissions"
          v-if="canExport"
        />
        <Button
          label="批量操作"
          icon="pi pi-cog"
          severity="secondary"
          @click="showBatchActions"
          v-if="canBatchManage"
        />
        <Button
          label="创建权限"
          icon="pi pi-plus"
          @click="createPermission"
          v-if="canCreate"
        />
      </div>
    </template>

    <div class="permissions-page">
      <!-- 权限统计卡片 -->
      <div class="stats-cards">
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
          <div class="stat-icon active">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activePermissions }}</div>
            <div class="stat-label">激活权限</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon roles">
            <i class="pi pi-users"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalRoles }}</div>
            <div class="stat-label">角色数量</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon assignments">
            <i class="pi pi-link"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalAssignments }}</div>
            <div class="stat-label">权限分配</div>
          </div>
        </div>
      </div>

      <!-- 权限管理区域 -->
      <div class="management-section">
        <div class="section-header">
          <h3 class="section-title">权限管理</h3>
          <div class="section-actions">
            <TabView
              v-model:activeIndex="activeTab"
              class="permission-tabs"
            >
              <TabPanel header="权限列表">
                <PermissionManagement
                  @permission-edit="handlePermissionEdit"
                  @role-edit="handleRoleEdit"
                  @assignment-change="handleAssignmentChange"
                />
              </TabPanel>

              <TabPanel header="角色管理">
                <div class="role-management">
                  <div class="role-header">
                    <h4>系统角色</h4>
                    <Button
                      label="创建角色"
                      icon="pi pi-plus"
                      size="small"
                      @click="createRole"
                      v-if="canCreateRole"
                    />
                  </div>
                  <RoleSelector
                    v-model="selectedRoles"
                    :showSelectedInfo="true"
                    :multiple="true"
                    @change="handleRoleSelection"
                  />
                </div>
              </TabPanel>

              <TabPanel header="权限树">
                <PermissionTree
                  :showActions="canManagePermissions"
                  @permission-edit="handlePermissionEdit"
                  @permission-delete="handlePermissionDelete"
                />
              </TabPanel>

              <TabPanel header="用户分配" v-if="canAssignRoles">
                <UserRoleAssignment
                  @assignment-change="handleAssignmentChange"
                  @user-select="handleUserSelect"
                />
              </TabPanel>
            </TabView>
          </div>
        </div>
      </div>

      <!-- 权限申请管理（管理员视图） -->
      <div class="request-management" v-if="canManageRequests">
        <div class="section-header">
          <h3 class="section-title">权限申请管理</h3>
          <div class="request-stats">
            <Badge
              :value="pendingRequestsCount"
              severity="danger"
              v-if="pendingRequestsCount > 0"
            />
            <span class="pending-text">待审批申请</span>
          </div>
        </div>

        <DataTable
          :value="permissionRequests"
          :loading="requestsLoading"
          paginator
          :rows="10"
          dataKey="id"
          :filters="requestFilters"
          filterDisplay="row"
          :globalFilterFields="['reason', 'requestedBy', 'status']"
          class="requests-table"
        >
          <Column field="requestedBy" header="申请人" sortable>
            <template #body="{ data }">
              <div class="requester-info">
                <Avatar
                  :image="data.requester.avatar"
                  :label="data.requester.name?.charAt(0) || 'U'"
                  size="small"
                />
                <div>
                  <div class="requester-name">{{ data.requester.name }}</div>
                  <div class="requester-email">{{ data.requester.email }}</div>
                </div>
              </div>
            </template>
          </Column>

          <Column field="reason" header="申请原因">
            <template #body="{ data }">
              <div class="reason-text">{{ data.reason }}</div>
            </template>
          </Column>

          <Column field="permissions" header="申请权限">
            <template #body="{ data }">
              <div class="permission-tags">
                <Chip
                  v-for="permission in data.permissions"
                  :key="permission"
                  :label="permission"
                  size="small"
                  class="permission-chip"
                />
                <Chip
                  v-for="role in data.roles"
                  :key="role"
                  :label="role"
                  severity="info"
                  size="small"
                  class="role-chip"
                />
              </div>
            </template>
          </Column>

          <Column field="urgency" header="紧急程度" sortable>
            <template #body="{ data }">
              <Tag
                :value="getUrgencyLabel(data.urgency)"
                :severity="getUrgencySeverity(data.urgency)"
                size="small"
              />
            </template>
          </Column>

          <Column field="status" header="状态" sortable>
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
                size="small"
              />
            </template>
          </Column>

          <Column field="requestedAt" header="申请时间" sortable>
            <template #body="{ data }">
              {{ formatDate(data.requestedAt) }}
            </template>
          </Column>

          <Column header="操作" :exportable="false">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-eye"
                  size="small"
                  text
                  rounded
                  @click="viewRequest(data)"
                  v-tooltip="'查看详情'"
                />
                <Button
                  v-if="data.status === 'pending'"
                  icon="pi pi-check"
                  size="small"
                  text
                  rounded
                  severity="success"
                  @click="approveRequest(data)"
                  v-tooltip="'批准申请'"
                />
                <Button
                  v-if="data.status === 'pending'"
                  icon="pi pi-times"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  @click="rejectRequest(data)"
                  v-tooltip="'拒绝申请'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
// 权限控制
const permissionControl = usePermissionControl({
  permissions: [
    'permission:read',
    'permission:manage',
    'role:manage',
    'user:assign'
  ],
  fallback: 'deny'
})

// 计算权限
const canRead = computed(() => permissionControl.canAccess.value)
const canCreate = computed(() =>
  permissionControl.requirePermission('permission:create')
)
const canExport = computed(() =>
  permissionControl.requirePermission('permission:export')
)
const canBatchManage = computed(() =>
  permissionControl.requirePermission('permission:batch')
)
const canManagePermissions = computed(() =>
  permissionControl.requirePermission('permission:manage')
)
const canCreateRole = computed(() =>
  permissionControl.requirePermission('role:create')
)
const canAssignRoles = computed(() =>
  permissionControl.requirePermission('user:assign')
)
const canManageRequests = computed(() =>
  permissionControl.requirePermission('request:manage')
)

// 页面数据
const activeTab = ref(0)
const selectedRoles = ref([])
const permissionRequests = ref([])
const pendingRequestsCount = ref(0)
const requestsLoading = ref(false)

const stats = ref({
  totalPermissions: 0,
  activePermissions: 0,
  totalRoles: 0,
  totalAssignments: 0
})

const requestFilters = ref({
  global: { value: null, matchMode: 'contains' }
})

// 方法
const loadStats = async () => {
  if (!canRead.value) return

  try {
    const [permissionsResponse, rolesResponse] = await Promise.all([
      $fetch('/api/v1/admin/permissions'),
      $fetch('/api/v1/admin/roles')
    ])

    const permissions = permissionsResponse.data || []
    const roles = rolesResponse.data || []

    stats.value = {
      totalPermissions: permissions.length,
      activePermissions: permissions.filter(p => p.isActive).length,
      totalRoles: roles.length,
      totalAssignments: roles.reduce((sum, role) => sum + (role.userCount || 0), 0)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadPermissionRequests = async () => {
  if (!canManageRequests.value) return

  requestsLoading.value = true
  try {
    const { data } = await $fetch('/api/v1/admin/permission-requests')
    permissionRequests.value = data
    pendingRequestsCount.value = data.filter((r: any) => r.status === 'pending').length
  } catch (error) {
    console.error('加载权限申请失败:', error)
  } finally {
    requestsLoading.value = false
  }
}

const createPermission = () => {
  // 打开创建权限对话框
  useToast().info('创建权限功能开发中...')
}

const createRole = () => {
  // 打开创建角色对话框
  useToast().info('创建角色功能开发中...')
}

const exportPermissions = async () => {
  if (!canExport.value) return

  try {
    const response = await $fetch('/api/v1/admin/permissions/export')
    // 处理文件下载
    const blob = new Blob([response], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'permissions-export.json'
    a.click()
    window.URL.revokeObjectURL(url)
    useToast().success('权限数据导出成功')
  } catch (error) {
    console.error('导出权限数据失败:', error)
    useToast().error('导出权限数据失败')
  }
}

const showBatchActions = () => {
  useToast().info('批量操作功能开发中...')
}

const handlePermissionEdit = (permission: any) => {
  useToast().info(`编辑权限: ${permission.name}`)
}

const handleRoleEdit = (role: any) => {
  useToast().info(`编辑角色: ${role.name}`)
}

const handlePermissionDelete = (permission: any) => {
  useToast().info(`删除权限: ${permission.name}`)
}

const handleAssignmentChange = (assignments: any[]) => {
  useToast().success(`角色分配已更新: ${assignments.length} 个分配`)
  loadStats()
}

const handleRoleSelection = (roles: any[], selectedRolesObjects: any[]) => {
  console.log('角色选择变化:', roles, selectedRolesObjects)
}

const handleUserSelect = (user: any) => {
  console.log('用户选择:', user)
}

const viewRequest = (request: any) => {
  useToast().info(`查看权限申请: ${request.id}`)
}

const approveRequest = async (request: any) => {
  const confirmed = await useConfirm(
    '批准申请',
    `确定要批准 ${request.requester.name} 的权限申请吗？`
  )

  if (confirmed) {
    try {
      await $fetch(`/api/v1/admin/permission-requests/${request.id}/approve`, {
        method: 'POST'
      })

      useToast().success('权限申请已批准')
      await loadPermissionRequests()
    } catch (error) {
      console.error('批准申请失败:', error)
      useToast().error('批准申请失败')
    }
  }
}

const rejectRequest = async (request: any) => {
  const reason = prompt('请输入拒绝原因：')
  if (!reason) return

  try {
    await $fetch(`/api/v1/admin/permission-requests/${request.id}/reject`, {
      method: 'POST',
      body: { reason }
    })

    useToast().success('权限申请已拒绝')
    await loadPermissionRequests()
  } catch (error) {
    console.error('拒绝申请失败:', error)
    useToast().error('拒绝申请失败')
  }
}

const getUrgencyLabel = (urgency: string) => {
  const labels = {
    normal: '普通',
    urgent: '紧急',
    very_urgent: '非常紧急'
  }
  return labels[urgency] || urgency
}

const getUrgencySeverity = (urgency: string) => {
  const severities = {
    normal: 'info',
    urgent: 'warning',
    very_urgent: 'danger'
  }
  return severities[urgency] || 'secondary'
}

const getStatusLabel = (status: string) => {
  const labels = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已拒绝',
    expired: '已过期'
  }
  return labels[status] || status
}

const getStatusSeverity = (status: string) => {
  const severities = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    expired: 'secondary'
  }
  return severities[status] || 'secondary'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 权限不足处理
const handlePermissionDenied = () => {
  navigateTo('/permission-denied')
}

// 如果没有访问权限，显示权限不足页面
if (!permissionControl.canAccess.value) {
  navigateTo('/permission-denied')
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadPermissionRequests()
  ])
})

// 页面标题
useHead({
  title: '权限管理 - 智能会议室管理系统'
})

// 定义页面元数据
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'permission']
})
</script>

<style scoped>
.permissions-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 页面操作 */
.page-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.roles {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.stat-icon.assignments {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

/* 管理区域 */
.management-section {
  background: #ffffff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
}

.permission-tabs {
  margin-top: 1rem;
}

.role-management {
  padding: 1rem;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.role-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

/* 申请管理 */
.request-management {
  background: #ffffff;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.request-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pending-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.requests-table {
  margin-top: 1rem;
}

.requester-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.requester-name {
  font-weight: 500;
  color: #111827;
  font-size: 0.875rem;
}

.requester-email {
  color: #6b7280;
  font-size: 0.75rem;
}

.reason-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
  font-size: 0.875rem;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 200px;
}

.permission-chip,
.role-chip {
  margin: 0;
  font-size: 0.6875rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .permissions-page {
    gap: 1rem;
  }

  .page-actions {
    flex-direction: column;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .role-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .requester-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .reason-text {
    max-width: none;
    white-space: normal;
  }

  .permission-tags {
    max-width: none;
  }
}
</style>