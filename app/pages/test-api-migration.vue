<template>
  <div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">API迁移功能验证</h1>
    <p class="text-gray-600 mb-6">验证从 test-api-simple.vue 迁移到正式页面的API功能</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- 功能测试卡片 -->
      <div class="bg-white p-6 rounded-lg shadow-md border-2 border-green-200">
        <h2 class="text-xl font-semibold mb-4 text-green-600">✅ 预约创建功能</h2>
        <p class="text-gray-600 mb-4">测试真实的预约创建API集成</p>
        <NuxtLink
          to="/reservations/create"
          class="block w-full text-center bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors"
        >
          测试预约创建
        </NuxtLink>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
        <h2 class="text-xl font-semibold mb-4 text-blue-600">✅ 预约列表功能</h2>
        <p class="text-gray-600 mb-4">测试真实的预约列表API集成</p>
        <NuxtLink
          to="/reservations"
          class="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
        >
          测试预约列表
        </NuxtLink>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md border-2 border-purple-200">
        <h2 class="text-xl font-semibold mb-4 text-purple-600">✅ 会议室可用性</h2>
        <p class="text-gray-600 mb-4">测试真实的可用性查询API集成</p>
        <NuxtLink
          to="/rooms/availability"
          class="block w-full text-center bg-purple-500 hover:bg-purple-600 text-white py-2 rounded transition-colors"
        >
          测试可用性查询
        </NuxtLink>
      </div>
    </div>

    <!-- API测试状态 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">API迁移验证清单</h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
          <div>
            <h3 class="font-medium text-green-900">预约创建API迁移</h3>
            <p class="text-sm text-green-700">/reservations/create.vue 已集成 POST /api/v1/reservations</p>
          </div>
          <span class="text-green-600">✅ 完成</span>
        </div>

        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
          <div>
            <h3 class="font-medium text-green-900">预约列表API迁移</h3>
            <p class="text-sm text-green-700">/reservations/index.vue 已集成 GET /api/v1/reservations</p>
          </div>
          <span class="text-green-600">✅ 完成</span>
        </div>

        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
          <div>
            <h3 class="font-medium text-green-900">可用性查询API迁移</h3>
            <p class="text-sm text-green-700">/rooms/availability.vue 已集成 POST /api/v1/reservations/availability</p>
          </div>
          <span class="text-green-600">✅ 完成</span>
        </div>

        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
          <div>
            <h3 class="font-medium text-green-900">会议室数据API迁移</h3>
            <p class="text-sm text-green-700">所有页面已集成 GET /api/v1/rooms</p>
          </div>
          <span class="text-green-600">✅ 完成</span>
        </div>
      </div>
    </div>

    <!-- 对比测试 -->
    <div class="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-800">功能对比测试</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="border rounded-lg p-4">
          <h3 class="font-medium text-gray-900 mb-3">原始测试页面</h3>
          <p class="text-sm text-gray-600 mb-4">test-api-simple.vue - API功能测试</p>
          <NuxtLink
            to="/test-api-simple"
            class="block w-full text-center bg-gray-500 hover:bg-gray-600 text-white py-2 rounded transition-colors"
          >
            打开原始测试页面
          </NuxtLink>
        </div>

        <div class="border rounded-lg p-4 border-green-200">
          <h3 class="font-medium text-green-900 mb-3">迁移后的正式页面</h3>
          <p class="text-sm text-gray-600 mb-4">正式业务页面 - 集成了真实API</p>
          <div class="space-y-2">
            <NuxtLink
              to="/reservations/create"
              class="block w-full text-center bg-green-100 hover:bg-green-200 text-green-800 py-2 rounded transition-colors"
            >
              预约创建页面
            </NuxtLink>
            <NuxtLink
              to="/reservations"
              class="block w-full text-center bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 rounded transition-colors"
            >
              预约列表页面
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 测试说明 -->
    <div class="mt-8 bg-yellow-50 rounded-lg shadow-md p-6 border border-yellow-200">
      <h2 class="text-xl font-semibold mb-4 text-yellow-800">🧪 测试说明</h2>

      <div class="space-y-3 text-sm text-yellow-700">
        <div class="flex items-start gap-2">
          <span class="text-yellow-600">1.</span>
          <span>所有正式页面已从模拟数据切换到真实API调用</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-yellow-600">2.</span>
          <span>API调用失败时会自动回退到模拟数据，确保页面正常显示</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-yellow-600">3.</span>
          <span>预约创建支持冲突检测和权限验证</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-yellow-600">4.</span>
          <span>可用性查询支持多会议室批量查询</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="text-yellow-600">5.</span>
          <span>所有页面都包含适当的加载状态和错误处理</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 页面元数据
definePageMeta({
  title: 'API迁移功能验证',
  description: '验证从测试页面迁移到正式页面的API功能'
})
</script>