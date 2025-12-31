<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 通用头部导航 -->
    <UniversalHeader />

    <!-- 主要内容区域 -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
console.log('[Default Layout] Layout rendered with UniversalHeader!')
</script>
