<template>
  <div class="p-3 bg-gray-50 min-h-screen">
    <RoomManagement />
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'AdminLayout',
  middleware: 'auth'
})

// 导入会议室管理组件
import RoomManagement from '~/components/features/rooms/RoomManagement.vue'
</script>

<style scoped>
/* 页面样式由 RoomManagement 组件处理 */
</style>