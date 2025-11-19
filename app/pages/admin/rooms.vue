<template>
  <div class="min-h-screen bg-gray-50">
    <UniversalHeader />
    <RoomManagement />
  </div>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

// 导入会议室管理组件
import RoomManagement from '~/components/features/rooms/RoomManagement.vue'
</script>

<style scoped>
</style>