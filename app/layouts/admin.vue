<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 通用头部导航组件 -->
    <UniversalHeader />

    <!-- 主要内容区域 -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// 简化的admin layout - 不包含复杂的认证状态检查
// 认证和权限由中间件处理，layout只负责布局
</script>