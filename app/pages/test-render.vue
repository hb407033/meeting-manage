<template>
  <div class="p-8 bg-green-50 min-h-screen">
    <h1 class="text-3xl font-bold text-green-600 mb-4">测试页面</h1>
    <p>如果您能看到这个页面，说明页面渲染正常。</p>
    <div class="mt-4">
      <NuxtLink to="/" class="text-blue-600 hover:underline">返回首页</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  auth: false
})
</script>