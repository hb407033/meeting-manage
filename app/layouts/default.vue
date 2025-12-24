<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 简化布局 - 仅显示基本结构 -->
    <div class="w-full border-b bg-white">
      <div class="w-full px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-xl font-bold text-gray-900">会议室管理系统 - 测试布局</h1>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
console.log('[Default Layout] Layout rendered!')
</script>