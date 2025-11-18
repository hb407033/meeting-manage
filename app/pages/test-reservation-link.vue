<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">NuxtLink 测试页面</h1>
    <p class="mb-4">测试 NuxtLink 跳转功能</p>

    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold mb-2">NuxtLink 测试</h2>
        <div class="flex gap-4">
          <NuxtLink
            to="/reservations"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            跳转到预约页面 (NuxtLink)
          </NuxtLink>

          <NuxtLink
            to="/test-simple"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            跳转到简单测试页
          </NuxtLink>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold mb-2">普通链接测试</h2>
        <div class="flex gap-4">
          <a
            href="/reservations"
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            跳转到预约页面 (普通链接)
          </a>

          <button
            @click="testNavigation"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            编程式导航
          </button>
        </div>
      </div>

      <div class="mt-8 p-4 bg-blue-50 rounded">
        <h3 class="font-semibold mb-2">测试结果</h3>
        <p>{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('点击上面的链接测试 NuxtLink 跳转功能')

function testNavigation() {
  message.value = '正在测试编程式导航...'

  // 尝试编程式导航
  try {
    navigateTo('/reservations')
    message.value = '编程式导航调用成功'
  } catch (error) {
    console.error('导航错误:', error)
    message.value = `导航错误: ${error.message}`
  }
}
</script>