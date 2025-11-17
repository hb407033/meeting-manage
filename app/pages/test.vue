<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-blue-600 mb-4">测试页面</h1>
      <p class="text-gray-600">如果你能看到这个页面，说明路由系统工作正常</p>
      <NuxtLink to="/auth/login" class="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg">
        前往登录
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: '测试页面',
  layout: 'default'
})
</script>