<template>
  <div class="admin-permissions-page">
    <PermissionManagement />
  </div>
</template>

<script setup lang="ts">
// 权限管理组件
import PermissionManagement from '~/components/admin/PermissionManagement.vue'

// 页面元数据
definePageMeta({
  title: '权限管理',
  layout: 'AdminLayout',
  middleware: 'auth'
})

// 页面头部信息
useHead({
  title: '权限管理 - 智能会议室管理系统',
  meta: [
    { name: 'description', content: '系统权限管理页面，管理用户权限和角色' }
  ]
})
</script>

<style scoped>
.admin-permissions-page {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
}
</style>