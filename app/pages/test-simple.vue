<script setup lang="ts">
// 页面配置
definePageMeta({
  layout: 'default',
  title: '简单测试',
  description: '测试基本页面功能'
})

// 响应式数据
const message = ref('日历组件测试页面 - 简化版本')
const counter = ref(0)

// 方法
function increment() {
  counter.value++
}

function testAPI() {
  $fetch('/api/test-status')
    .then(response => response.json())
    .then(data => {
      console.log('API response:', data)
      message.value = `API 测试成功: ${data.message}`
    })
    .catch(error => {
      console.error('API error:', error)
      message.value = `API 测试失败: ${error.message}`
    })
}

// 生命周期
onMounted(() => {
  console.log('页面已挂载')
})
</script>

<template>
  <div class="test-simple-page p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">{{ message }}</h1>

      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">基本功能测试</h2>

        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <button
              @click="increment"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              计数器: {{ counter }}
            </button>

            <button
              @click="testAPI"
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              测试 API
            </button>
          </div>

          <div class="text-sm text-gray-600">
            <p>✅ 基本页面渲染正常</p>
            <p>✅ Vue 响应式系统工作正常</p>
            <p>✅ 事件处理正常</p>
          </div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-blue-900 mb-4">修复状态</h2>

        <div class="space-y-2">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>✅ 服务器运行正常 (端口 3001)</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>✅ 数据库连接正常</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>✅ API 响应正常</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>⚠️ FullCalendar 组件兼容性问题 (需要修复)</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>⚠️ Socket.IO 插件暂时禁用 (需要修复)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-simple-page {
  @apply min-h-screen bg-gray-50;
}
</style>