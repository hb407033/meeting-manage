<script setup lang="ts">
// 初始化认证状态
const { initAuth } = useAuthStore()

// 在客户端初始化时恢复认证状态
onMounted(async () => {
  if (process.client) {
    await initAuth()
  }
})

// 设置页面标题
useHead({
  title: '智能会议室管理系统',
  meta: [
    { name: 'description', content: '基于现代Web技术栈的智能会议室管理平台' },
  ],
})
</script>

<template>
 <NuxtLayout>
 <NuxtPage />
 </NuxtLayout>
</template>
