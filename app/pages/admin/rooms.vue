<template>
  <div class="admin-rooms-page">
    <RoomManagement />
  </div>
</template>

<script setup lang="ts">
// 手动导入会议室管理组件
import RoomManagement from '~/components/features/rooms/RoomManagement.vue'

// 页面元数据
definePageMeta({
  title: '会议室管理',
  layout: 'AdminLayout',
  middleware: 'auth'
})

// 页面头部信息
useHead({
  title: '会议室管理 - 智能会议室管理系统',
  meta: [
    { name: 'description', content: '会议室管理页面，添加、编辑和删除会议室信息' }
  ]
})
</script>

<style scoped>
.admin-rooms-page {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
}
</style>