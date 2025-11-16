<template>
  <div class="admin-layout">
    <!-- 顶部导航栏 -->
    <header class="admin-header">
      <div class="admin-header-content">
        <div class="admin-header-left">
          <div class="admin-logo">
            <h1 class="admin-logo-text">智能会议室管理系统</h1>
            <span class="admin-logo-badge">管理后台</span>
          </div>
        </div>

        <div class="admin-header-right">
          <!-- 用户信息 -->
          <div class="admin-user-info">
            <Avatar
              :image="userInfo?.avatar"
              :label="userInfo?.name?.charAt(0) || 'U'"
              class="admin-user-avatar"
              size="small"
            />
            <div class="admin-user-details">
              <span class="admin-user-name">{{ userInfo?.name }}</span>
              <span class="admin-user-role">{{ userInfo?.roles?.[0]?.name || '用户' }}</span>
            </div>
            <Button
              @click="handleLogout"
              icon="pi pi-sign-out"
              class="p-button-text"
              label="退出"
              severity="secondary"
            />
          </div>
        </div>
      </div>
    </header>

    <div class="admin-body">
      <!-- 侧边导航 -->
      <aside class="admin-sidebar">
        <nav class="admin-nav">
          <div class="admin-nav-section">
            <h3 class="admin-nav-title">权限管理</h3>
            <ul class="admin-nav-list">
              <li>
                <NuxtLink
                  to="/admin/permissions"
                  class="admin-nav-link"
                  :class="{ 'active': $route.path === '/admin/permissions' }"
                >
                  <i class="pi pi-key admin-nav-icon"></i>
                  <span>权限管理</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/roles"
                  class="admin-nav-link"
                  :class="{ 'active': $route.path === '/admin/roles' }"
                >
                  <i class="pi pi-users admin-nav-icon"></i>
                  <span>角色管理</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/users"
                  class="admin-nav-link"
                  :class="{ 'active': $route.path === '/admin/users' }"
                >
                  <i class="pi pi-user admin-nav-icon"></i>
                  <span>用户管理</span>
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div class="admin-nav-section">
            <h3 class="admin-nav-title">系统管理</h3>
            <ul class="admin-nav-list">
              <li>
                <NuxtLink
                  to="/admin/organizations"
                  class="admin-nav-link"
                  :class="{ 'active': $route.path === '/admin/organizations' }"
                >
                  <i class="pi pi-sitemap admin-nav-icon"></i>
                  <span>组织架构</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/audit"
                  class="admin-nav-link"
                  :class="{ 'active': $route.path === '/admin/audit' }"
                >
                  <i class="pi pi-history admin-nav-icon"></i>
                  <span>审计日志</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- 主内容区域 -->
      <main class="admin-main">
        <div class="admin-main-content">
          <!-- 面包屑导航 -->
          <Breadcrumb v-if="breadcrumbs.length > 0" class="admin-breadcrumb">
            <BreadcrumbItem
              v-for="(item, index) in breadcrumbs"
              :key="index"
              :label="item.label"
              :to="index === breadcrumbs.length - 1 ? null : item.to"
            />
          </Breadcrumb>

          <!-- 页面标题 -->
          <div class="admin-page-header">
            <h2 class="admin-page-title">{{ pageTitle }}</h2>
            <div class="admin-page-actions">
              <slot name="page-actions" />
            </div>
          </div>

          <!-- 页面内容 -->
          <div class="admin-page-content">
            <slot />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// 获取用户信息和权限
const userInfo = await getCurrentUser()

// 页面标题和面包屑
const pageTitle = computed(() => {
  const route = useRoute()
  const titleMap: Record<string, string> = {
    '/admin/permissions': '权限管理',
    '/admin/roles': '角色管理',
    '/admin/users': '用户管理',
    '/admin/organizations': '组织架构',
    '/admin/audit': '审计日志'
  }
  return titleMap[route.path] || '管理后台'
})

const breadcrumbs = computed(() => {
  const route = useRoute()
  const breadcrumbMap: Record<string, Array<{ label: string; to?: string }>> = {
    '/admin/permissions': [
      { label: '管理后台', to: '/admin' },
      { label: '权限管理' }
    ],
    '/admin/roles': [
      { label: '管理后台', to: '/admin' },
      { label: '角色管理' }
    ],
    '/admin/users': [
      { label: '管理后台', to: '/admin' },
      { label: '用户管理' }
    ],
    '/admin/organizations': [
      { label: '管理后台', to: '/admin' },
      { label: '组织架构' }
    ],
    '/admin/audit': [
      { label: '管理后台', to: '/admin' },
      { label: '审计日志' }
    ]
  }
  return breadcrumbMap[route.path] || []
})

// 权限检查
const { hasPermission } = usePermissions()

// 退出登录
const handleLogout = async () => {
  try {
    await $fetch('/api/v1/auth/logout', {
      method: 'POST'
    })
    await navigateTo('/login')
  } catch (error) {
    console.error('退出登录失败:', error)
    // 即使API失败也要重定向到登录页
    await navigateTo('/login')
  }
}

// 权限守卫
onMounted(async () => {
  // 检查用户是否有管理员权限
  const hasAdminAccess = await hasPermission(userInfo.value?.id || '', 'admin:access')
  if (!hasAdminAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: '权限不足，无法访问管理后台'
    })
  }
})

// 页面标题
useHead({
  title: computed(() => `${pageTitle.value} - 智能会议室管理系统`)
})
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* 顶部导航栏 */
.admin-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.admin-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  height: 4rem;
}

.admin-header-left {
  display: flex;
  align-items: center;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e40af;
  margin: 0;
}

.admin-logo-badge {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.admin-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-user-avatar {
  flex-shrink: 0;
}

.admin-user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.admin-user-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.25;
}

.admin-user-role {
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1;
}

/* 主体内容 */
.admin-body {
  flex: 1;
  display: flex;
  min-height: calc(100vh - 4rem);
}

/* 侧边栏 */
.admin-sidebar {
  width: 16rem;
  background-color: #ffffff;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
}

.admin-nav {
  padding: 1rem 0;
}

.admin-nav-section {
  margin-bottom: 2rem;
}

.admin-nav-section:last-child {
  margin-bottom: 0;
}

.admin-nav-title {
  padding: 0 1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.admin-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.admin-nav-link:hover {
  background-color: #f3f4f6;
  color: #1e40af;
}

.admin-nav-link.active {
  background-color: #dbeafe;
  color: #1e40af;
  border-left-color: #1e40af;
}

.admin-nav-icon {
  font-size: 1rem;
  width: 1rem;
  text-align: center;
}

/* 主内容区域 */
.admin-main {
  flex: 1;
  overflow-y: auto;
}

.admin-main-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.admin-breadcrumb {
  margin-bottom: 1.5rem;
}

.admin-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.admin-page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.admin-page-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-page-content {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-header-content {
    padding: 0 1rem;
  }

  .admin-sidebar {
    width: 14rem;
  }

  .admin-main-content {
    padding: 1rem;
  }

  .admin-page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .admin-user-details {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .admin-body {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }
}
</style>