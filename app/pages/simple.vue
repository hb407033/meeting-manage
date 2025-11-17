<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold text-blue-600">简单测试页面</h1>
    <p class="mt-4 text-gray-700">如果你能看到这个页面，说明Nuxt路由系统正常工作</p>
    <NuxtLink to="/" class="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded">
      回到首页
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: '简单测试'
})
</script>