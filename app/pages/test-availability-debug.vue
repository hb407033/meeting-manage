<script setup lang="ts">
import { ref, onMounted } from 'vue'

const availabilityData = ref({})
const loading = ref(false)
const error = ref('')
const selectedRoomId = ref('')

const roomIds = ref([
  { id: 'cmi3feiz600009arow7mo5oda', name: 'cesbifdsad' }
  // 可以添加更多会议室ID
])

async function testAvailabilityAPI() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/test/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        roomIds: roomIds.value.map(r => r.id),
        startTime: '2025-11-19T00:00:00.000Z',
        endTime: '2025-11-19T23:59:59.999Z'
      }
    })

    console.log('📊 可用性API响应:', response)
    availabilityData.value = response.data

    // 自动选择第一个会议室
    if (roomIds.value.length > 0) {
      selectedRoomId.value = roomIds.value[0].id
    }

  } catch (err: any) {
    console.error('❌ 可用性API Error:', err)
    error.value = err.message || err.toString()
  } finally {
    loading.value = false
  }
}

function formatTime(timeStr: string) {
  return new Date(timeStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(timeStr: string) {
  return new Date(timeStr).toLocaleDateString('zh-CN')
}

function getStatusColor(status: string) {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800'
    case 'unavailable': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

onMounted(() => {
  testAvailabilityAPI()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">会议室可用性调试页面</h1>

      <!-- API调用按钮 -->
      <div class="mb-6">
        <button
          @click="testAvailabilityAPI"
          :disabled="loading"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {{ loading ? '加载中...' : '重新加载可用性数据' }}
        </button>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 class="text-red-800 font-medium">错误信息:</h3>
        <pre class="text-red-600 text-sm mt-2">{{ error }}</pre>
      </div>

      <!-- API原始响应 -->
      <div v-if="availabilityData && Object.keys(availabilityData).length > 0" class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 class="text-gray-800 font-medium mb-2">API响应摘要:</h3>
        <pre class="text-gray-600 text-sm overflow-x-auto">
{{ JSON.stringify({
  roomCount: Object.keys(availabilityData).length,
  firstRoom: Object.values(availabilityData)[0]
}, null, 2) }}</pre>
      </div>

      <!-- 可用性数据展示 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="room in Object.values(availabilityData)"
          :key="room.roomId"
          class="bg-white rounded-lg shadow-sm border p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ room.roomName }}</h3>
            <span :class="[
              'px-2 py-1 text-xs font-medium rounded-full',
              getStatusColor(room.status)
            ]">
              {{ room.status === 'available' ? '可用' : '不可用' }}
            </span>
          </div>

          <!-- 预约列表 -->
          <div v-if="room.reservations && room.reservations.length > 0" class="mb-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">当前预约:</h4>
            <div class="space-y-2">
              <div
                v-for="reservation in room.reservations"
                :key="reservation.id"
                class="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div class="text-sm font-medium text-red-800">{{ reservation.title }}</div>
                <div class="text-xs text-red-600 mt-1">
                  {{ reservation.organizerName }} |
                  {{ formatDate(reservation.startTime) }}
                  {{ formatTime(reservation.startTime) }} -
                  {{ formatTime(reservation.endTime) }}
                </div>
                <div class="text-xs text-red-500 mt-1">状态: {{ reservation.status }}</div>
              </div>
            </div>
          </div>

          <!-- 可用时间段 -->
          <div v-if="room.availableSlots && room.availableSlots.length > 0">
            <h4 class="text-sm font-medium text-gray-900 mb-2">
              可用时间段 ({{ room.availableSlots.length }}个):
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="slot in room.availableSlots"
                :key="slot.startTime"
                class="p-2 bg-green-50 border border-green-200 rounded text-center"
              >
                <div class="text-xs font-medium text-green-800">
                  {{ formatTime(slot.startTime) }} - {{ formatTime(slot.endTime) }}
                </div>
                <div class="text-xs text-green-600">{{ slot.duration }}分钟</div>
              </div>
            </div>
          </div>

          <div v-else-if="room.status === 'available' && (!room.availableSlots || room.availableSlots.length === 0)" class="text-sm text-gray-500">
            当前时间段暂无可用时间段（可能已有预约覆盖）
          </div>

          <div v-else class="text-sm text-gray-500">
            会议室不可用或无可用时间段
          </div>
        </div>
      </div>

      <!-- 修复说明 -->
      <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 class="text-blue-800 font-medium mb-2">✅ 修复验证:</h3>
        <div class="text-sm text-blue-700 space-y-1">
          <div>1. <strong>按半小时切分</strong>: 可用时间段现在按30分钟为单位进行切分</div>
          <div>2. <strong>营业时间限制</strong>: 根据会议室的operatingHours限制可用时间范围</div>
          <div>3. <strong>冲突检测</strong>: 检测时间段是否与现有预约重叠</div>
          <div>4. <strong>API响应格式</strong>: 修复了前端store对API响应格式的处理</div>
        </div>
      </div>
    </div>
  </div>
</template>