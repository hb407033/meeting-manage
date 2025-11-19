<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">路由迁移测试页面</h1>

      <!-- 迁移状态总览 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          <i class="pi pi-check-circle text-green-600 mr-2"></i>
          迁移完成状态
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-medium text-gray-700 mb-3">✅ 已完成</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                创建 admin/rooms 路由结构
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                迁移会议室统计功能
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                迁移会议室可用时间页面
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                迁移会议室详情页面
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                更新所有导航链接
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500"></i>
                移除原有 /rooms 路由
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-700 mb-3">🔄 新路由结构</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <i class="pi pi-arrow-right text-blue-500"></i>
                /admin/rooms → 会议室管理主页
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-arrow-right text-blue-500"></i>
                /admin/rooms/availability → 可用时间管理
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-arrow-right text-blue-500"></i>
                /admin/rooms/[id] → 会议室详情
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-arrow-right text-blue-500"></i>
                /admin/rooms/create → 新建会议室
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-arrow-right text-blue-500"></i>
                /admin/rooms/[id]/edit → 编辑会议室
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 测试链接区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          <i class="pi pi-external-link text-blue-600 mr-2"></i>
          新路由测试链接
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">会议室管理主页</h3>
            <p class="text-sm text-gray-600 mb-3">包含统计功能的管理页面</p>
            <NuxtLink
              to="/admin/rooms"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-arrow-right mr-2"></i>
              访问 /admin/rooms
            </NuxtLink>
          </div>

          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">可用时间管理</h3>
            <p class="text-sm text-gray-600 mb-3">会议室可用时间查看和管理</p>
            <NuxtLink
              to="/admin/rooms/availability"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-arrow-right mr-2"></i>
              访问 /admin/rooms/availability
            </NuxtLink>
          </div>

          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">新建会议室</h3>
            <p class="text-sm text-gray-600 mb-3">创建新的会议室</p>
            <NuxtLink
              to="/admin/rooms/create"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-arrow-right mr-2"></i>
              访问 /admin/rooms/create
            </NuxtLink>
          </div>

          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">会议室详情</h3>
            <p class="text-sm text-gray-600 mb-3">查看会议室详细信息 (ID: 1)</p>
            <NuxtLink
              to="/admin/rooms/1"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-arrow-right mr-2"></i>
              访问 /admin/rooms/1
            </NuxtLink>
          </div>

          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">编辑会议室</h3>
            <p class="text-sm text-gray-600 mb-3">编辑会议室信息 (ID: 1)</p>
            <NuxtLink
              to="/admin/rooms/1/edit"
              class="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-arrow-right mr-2"></i>
              访问 /admin/rooms/1/edit
            </NuxtLink>
          </div>

          <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <h3 class="font-medium text-gray-900 mb-2">返回主页</h3>
            <p class="text-sm text-gray-600 mb-3">测试主页链接更新</p>
            <NuxtLink
              to="/"
              class="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <i class="pi pi-home mr-2"></i>
              返回主页
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 权限测试区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          <i class="pi pi-shield text-purple-600 mr-2"></i>
          权限访问测试
        </h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 class="font-medium text-gray-900">当前用户权限</h3>
              <p class="text-sm text-gray-600">测试不同权限级别对会议室管理的访问</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500">用户角色:</div>
              <div class="font-medium text-gray-900">{{ userRole || '未登录' }}</div>
              <div class="text-xs text-gray-500 mt-1">
                room:read = {{ canAccess('room', 'read') ? '✅' : '❌' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 旧路由测试区域 -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-yellow-800 mb-4">
          <i class="pi pi-exclamation-triangle text-yellow-600 mr-2"></i>
          旧路由验证 (应显示404)
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="border border-yellow-300 rounded-lg p-4 bg-yellow-100">
            <h3 class="font-medium text-yellow-900 mb-2">旧会议室主页</h3>
            <p class="text-sm text-yellow-700 mb-3">应该显示 404 错误</p>
            <NuxtLink
              to="/rooms"
              class="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <i class="pi pi-times mr-2"></i>
              访问 /rooms (应404)
            </NuxtLink>
          </div>

          <div class="border border-yellow-300 rounded-lg p-4 bg-yellow-100">
            <h3 class="font-medium text-yellow-900 mb-2">旧可用时间页面</h3>
            <p class="text-sm text-yellow-700 mb-3">应该显示 404 错误</p>
            <NuxtLink
              to="/rooms/availability"
              class="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <i class="pi pi-times mr-2"></i>
              访问 /rooms/availability (应404)
            </NuxtLink>
          </div>

          <div class="border border-yellow-300 rounded-lg p-4 bg-yellow-100">
            <h3 class="font-medium text-yellow-900 mb-2">旧会议室详情</h3>
            <p class="text-sm text-yellow-700 mb-3">应该显示 404 错误</p>
            <NuxtLink
              to="/rooms/1"
              class="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <i class="pi pi-times mr-2"></i>
              访问 /rooms/1 (应404)
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// 认证信息
const { user, userRole, canAccess } = useAuth()
</script>

<style scoped>
/* 测试页面样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>