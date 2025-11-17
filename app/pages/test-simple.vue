<template>
  <div class="p-8 bg-green-50 min-h-screen">
    <h1 class="text-4xl font-bold text-green-600 mb-4">简单测试页面</h1>
    <p class="text-lg text-gray-700 mb-4">这是一个简单的测试页面，不使用任何布局</p>
    <div class="space-y-4">
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-2">页面信息</h2>
        <p>当前路径: {{ $route.path }}</p>
        <p>时间: {{ new Date().toLocaleString() }}</p>
      </div>

      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-2">测试链接</h2>
        <NuxtLink to="/auth/login" class="text-blue-600 hover:text-blue-800 underline">
          前往登录页面
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false // 不使用任何布局
})
</script>