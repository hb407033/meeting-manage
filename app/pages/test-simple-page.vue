<template>
  <div class="p-8 bg-green-50 min-h-screen">
    <h1 class="text-3xl font-bold text-green-600 mb-4">测试页面</h1>
    <p class="text-lg text-gray-700">
      这是一个简单的测试页面，不使用任何布局。
    </p>
    <div class="mt-4 p-4 bg-white rounded shadow">
      <p>当前时间: {{ currentTime }}</p>
      <button @click="updateTime" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        更新时间
      </button>
    </div>
  </div>
</template>

<script setup>
const currentTime = ref(new Date().toLocaleString())

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

// 设置页面标题
useHead({
  title: '测试页面'
})
</script>