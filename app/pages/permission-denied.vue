<template>
  <div class="permission-denied-page">
    <div class="permission-denied-container">
      <div class="permission-denied-content">
        <!-- 权限拒绝图标 -->
        <div class="permission-denied-icon">
          <i class="pi pi-lock"></i>
        </div>

        <!-- 标题和描述 -->
        <div class="permission-denied-text">
          <h1 class="permission-denied-title">权限不足</h1>
          <p class="permission-denied-description">
            很抱歉，您没有权限访问此页面或功能。
          </p>
        </div>

        <!-- 详细信息 -->
        <div v-if="hasPermissionDetails" class="permission-denied-details">
          <div class="details-card">
            <h3>详细信息</h3>

            <div v-if="requiredPermissions.length > 0" class="detail-item">
              <span class="detail-label">所需权限：</span>
              <div class="permission-tags">
                <span
                  v-for="permission in requiredPermissions"
                  :key="permission"
                  class="permission-tag"
                >
                  {{ formatPermission(permission) }}
                </span>
              </div>
            </div>

            <div v-if="requiredRoles.length > 0" class="detail-item">
              <span class="detail-label">所需角色：</span>
              <div class="role-tags">
                <span
                  v-for="role in requiredRoles"
                  :key="role"
                  class="role-tag"
                >
                  {{ formatRole(role) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="permission-denied-actions">
          <Button
            @click="goBack"
            icon="pi pi-arrow-left"
            label="返回上一页"
            class="p-button-outlined"
            severity="secondary"
          />

          <Button
            @click="goHome"
            icon="pi pi-home"
            label="返回首页"
            class="ml-3"
          />

          <Button
            v-if="!isAuthenticated"
            @click="goToLogin"
            icon="pi pi-sign-in"
            label="重新登录"
            class="ml-3"
            severity="primary"
          />
        </div>

        <!-- 联系管理员 -->
        <div class="permission-denied-help">
          <p class="help-text">
            如果您认为应该有权限访问此功能，请联系系统管理员。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

// 路由和认证
const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

// 解析URL参数
const requiredPermissions = computed(() => {
  const permissions = route.query.required as string
  return permissions ? permissions.split(',').filter(p => p.trim()) : []
})

const requiredRoles = computed(() => {
  const roles = route.query.roles as string
  return roles ? roles.split(',').filter(r => r.trim()) : []
})

const redirectPath = computed(() => {
  return route.query.redirect as string || '/dashboard'
})

const hasPermissionDetails = computed(() => {
  return requiredPermissions.value.length > 0 || requiredRoles.value.length > 0
})

// 权限格式化
const formatPermission = (permission: string) => {
  const permissionMap: Record<string, string> = {
    'admin:access': '管理员访问',
    'permission:read': '查看权限',
    'permission:write': '编辑权限',
    'permission:manage': '管理权限',
    'role:read': '查看角色',
    'role:write': '编辑角色',
    'role:manage': '管理角色',
    'user:read': '查看用户',
    'user:write': '编辑用户',
    'user:manage': '管理用户',
    'room:read': '查看会议室',
    'room:create': '创建会议室',
    'room:update': '更新会议室',
    'room:delete': '删除会议室',
    'room:manage': '管理会议室',
    'reservation:read': '查看预约',
    'reservation:create': '创建预约',
    'reservation:update': '更新预约',
    'reservation:delete': '删除预约',
    'reservation:manage': '管理预约',
    'audit:read': '查看审计日志',
    'system:manage': '系统管理'
  }
  return permissionMap[permission] || permission
}

const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    'ADMIN': '系统管理员',
    'MANAGER': '管理员',
    'USER': '普通用户'
  }
  return roleMap[role] || role
}

// 页面操作
const goBack = () => {
  // 如果有重定向路径，返回上一页或去重定向页面
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push(redirectPath.value)
  }
}

const goHome = () => {
  router.push('/')
}

const goToLogin = () => {
  router.push({
    path: '/auth/login',
    query: { redirect: redirectPath.value }
  })
}

// 页面元数据
definePageMeta({
  title: '权限不足',
  layout: 'default'
})

// 页面头部信息
useHead({
  title: '权限不足 - 智能会议室管理系统',
  meta: [
    { name: 'description', content: '权限不足页面，您没有权限访问此功能' }
  ]
})
</script>

<style scoped>
.permission-denied-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.permission-denied-container {
  width: 100%;
  max-width: 600px;
}

.permission-denied-content {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.permission-denied-icon {
  margin-bottom: 2rem;
}

.permission-denied-icon i {
  font-size: 4rem;
  color: #ef4444;
}

.permission-denied-text {
  margin-bottom: 2rem;
}

.permission-denied-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.permission-denied-description {
  font-size: 1.125rem;
  color: #6b7280;
  line-height: 1.6;
}

.permission-denied-details {
  margin-bottom: 2rem;
}

.details-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: left;
}

.details-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.detail-item {
  margin-bottom: 1rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.permission-tags,
.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.permission-tag,
.role-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 9999px;
}

.permission-tag {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.role-tag {
  background-color: #f3e8ff;
  color: #7c3aed;
}

.permission-denied-actions {
  margin-bottom: 2rem;
}

.permission-denied-help {
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .permission-denied-page {
    padding: 1rem;
  }

  .permission-denied-content {
    padding: 2rem;
  }

  .permission-denied-title {
    font-size: 1.5rem;
  }

  .permission-denied-description {
    font-size: 1rem;
  }

  .permission-denied-actions {
    flex-direction: column;
  }

  .permission-denied-actions button {
    width: 100%;
    margin-left: 0 !important;
    margin-bottom: 0.5rem;
  }

  .permission-denied-actions button:last-child {
    margin-bottom: 0;
  }
}
</style>