<script setup lang="ts">
import { ref, onMounted } from 'vue'

const reservations = ref([])
const loading = ref(false)
const error = ref('')
const apiResponse = ref(null)

async function testReservationAPI() {
  loading.value = true
  error.value = ''

  try {
    console.log('🔍 测试：调用公开API端点')

    // 首先尝试公开的调试API
    let response = await $fetch('/api/test/reservations')
    console.log('📊 公开API响应:', response)

    apiResponse.value = response

    // 尝试不同的响应格式处理
    if (response && typeof response === 'object') {
      if ('data' in response) {
        reservations.value = response.data
        console.log('✅ 使用data字段:', response.data)
      } else if ('reservations' in response) {
        reservations.value = response.reservations
        console.log('✅ 使用reservations字段:', response.reservations)
      } else if (Array.isArray(response)) {
        reservations.value = response
        console.log('✅ 使用数组直接:', response)
      } else {
        reservations.value = [response]
        console.log('✅ 使用单对象:', response)
      }
    } else {
      error.value = 'Invalid response format'
    }

  } catch (err: any) {
    console.error('❌ API Error:', err)
    error.value = err.message || err.toString()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  testReservationAPI()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">预约列表调试页面</h1>

      <!-- API调用按钮 -->
      <div class="mb-6">
        <button
          @click="testReservationAPI"
          :disabled="loading"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {{ loading ? '加载中...' : '重新加载预约列表' }}
        </button>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 class="text-red-800 font-medium">错误信息:</h3>
        <pre class="text-red-600 text-sm mt-2">{{ error }}</pre>
      </div>

      <!-- API原始响应 -->
      <div v-if="apiResponse" class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 class="text-gray-800 font-medium mb-2">API原始响应:</h3>
        <pre class="text-gray-600 text-sm overflow-x-auto">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
      </div>

      <!-- 处理后的预约列表 -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            预约列表 ({{ reservations.length }}条)
          </h2>
        </div>

        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p class="text-gray-500 mt-2">正在加载预约列表...</p>
        </div>

        <div v-else-if="reservations.length === 0" class="p-8 text-center text-gray-500">
          暂无预约数据
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="reservation in reservations"
            :key="reservation.id"
            class="p-6 hover:bg-gray-50"
          >
            <h3 class="text-lg font-medium text-gray-900">{{ reservation.title }}</h3>
            <div class="mt-2 text-sm text-gray-600">
              <p>会议室: {{ reservation.room?.name || '未知' }}</p>
              <p>组织者: {{ reservation.organizer?.name || '未知' }}</p>
              <p>开始时间: {{ new Date(reservation.startTime).toLocaleString() }}</p>
              <p>结束时间: {{ new Date(reservation.endTime).toLocaleString() }}</p>
              <p>状态: {{ reservation.status }}</p>
              <p class="text-xs text-gray-400">调试信息: roomId={{ reservation.roomId }}, organizerId={{ reservation.organizerId }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>