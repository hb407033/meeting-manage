<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 响应式数据
const message = ref('登录重定向测试页面')
const testResult = ref('')

// 测试登录后重定向的模拟函数
async function testLoginRedirect() {
  testResult.value = '正在测试登录重定向...'

  try {
    // 模拟登录成功后应该跳转到 /reservations
    // 这里我们检查当前 useAuth 的配置
    const { isAuthenticated } = useAuth()

    if (isAuthenticated.value) {
      testResult.value = '✅ 用户已登录，应该自动重定向到 /reservations'
      // 手动测试重定向
      setTimeout(() => {
        navigateTo('/reservations')
      }, 2000)
    } else {
      testResult.value = '⚠️ 用户未登录，点击登录按钮测试重定向功能'
    }
  } catch (error) {
    testResult.value = `❌ 测试失败: ${error.message}`
  }
}

onMounted(() => {
  console.log('✅ 登录重定向测试页面加载成功!')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">登录重定向测试</h1>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 class="text-lg font-semibold text-blue-900 mb-2">测试内容</h2>
          <p class="text-blue-800">
            验证登录成功后是否正确重定向到 <code class="bg-blue-100 px-2 py-1 rounded">/reservations</code>
          </p>
        </div>

        <div class="space-y-4">
          <button
            @click="testLoginRedirect"
            class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            测试登录重定向
          </button>

          <div v-if="testResult" class="p-4 rounded-lg" :class="[
            testResult.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            testResult.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-yellow-50 text-yellow-800 border border-yellow-200'
          ]">
            {{ testResult }}
          </div>
        </div>

        <div class="mt-8 border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">手动测试步骤</h3>
          <ol class="list-decimal list-inside space-y-2 text-gray-700">
            <li>访问 <code class="bg-gray-100 px-2 py-1 rounded">/auth/login</code> 页面</li>
            <li>使用测试账号登录</li>
            <li>验证登录成功后是否跳转到 <code class="bg-gray-100 px-2 py-1 rounded">/reservations</code></li>
            <li>检查 URL 中的 redirect 参数是否正常工作</li>
          </ol>
        </div>

        <div class="mt-8 border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">已修改的文件</h3>
          <ul class="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li><code>app/composables/useAuth.ts</code> - 修改登录/注册成功后的重定向路径</li>
            <li><code>app/pages/index.vue</code> - 更新首页链接指向预约功能</li>
          </ul>
        </div>

        <div class="mt-8 border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">快速导航</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NuxtLink
              to="/"
              class="p-3 bg-gray-50 hover:bg-gray-100 border rounded-lg text-center"
            >
              <i class="pi pi-home text-gray-600"></i>
              <div class="text-sm text-gray-700">首页</div>
            </NuxtLink>

            <NuxtLink
              to="/reservations"
              class="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-center"
            >
              <i class="pi pi-list text-blue-600"></i>
              <div class="text-sm text-blue-700">预约列表</div>
            </NuxtLink>

            <NuxtLink
              to="/reservations/create"
              class="p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-center"
            >
              <i class="pi pi-plus text-green-600"></i>
              <div class="text-sm text-green-700">新建预约</div>
            </NuxtLink>

            <NuxtLink
              to="/auth/login"
              class="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-center"
            >
              <i class="pi pi-sign-in text-purple-600"></i>
              <div class="text-sm text-purple-700">登录页面</div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-redirect {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>