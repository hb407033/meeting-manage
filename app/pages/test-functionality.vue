<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 响应式数据
const message = ref('测试页面加载成功！')

// 模拟会议室数据
const rooms = ref([
  {
    id: '1',
    name: '会议室 A',
    capacity: 10,
    status: 'available',
    operatingHours: {
      start: '09:00',
      end: '18:00'
    }
  },
  {
    id: '2',
    name: '会议室 B',
    capacity: 6,
    status: 'available',
    operatingHours: {
      start: '08:00',
      end: '20:00'
    }
  },
  {
    id: '3',
    name: '会议室 C',
    capacity: 20,
    status: 'available',
    operatingHours: {
      start: '08:30',
      end: '17:30'
    }
  }
])

onMounted(() => {
  console.log('✅ 功能测试页面加载成功！')
  message.value = '所有页面已创建完成，时间选择器已修复！'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4">
      <!-- 成功消息 -->
      <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <div class="flex items-center gap-3 mb-4">
          <i class="pi pi-check-circle text-green-600 text-2xl"></i>
          <h1 class="text-2xl font-bold text-green-800">功能修复完成！</h1>
        </div>
        <p class="text-green-700 mb-4">{{ message }}</p>

        <div class="bg-white rounded-lg p-4 border border-green-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">已完成的修复内容：</h2>
          <div class="space-y-2 text-sm text-gray-700">
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>修复时间选择器问题</strong>：现在根据各会议室的营业时间显示时间段</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>会议室A</strong>：09:00 - 18:00（标准工作时间）</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>会议室B</strong>：08:00 - 20:00（延长营业时间）</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>会议室C</strong>：08:30 - 17:30（弹性工作时间）</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>创建预约列表页面</strong>：/reservations/list</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-check text-green-600"></i>
              <span><strong>创建会议室可用时间页面</strong>：/rooms/availability</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 会议室营业时间展示 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="bg-white rounded-lg shadow-sm border p-6"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ room.name }}</h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              可用
            </span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex items-center gap-2 text-gray-600">
              <i class="pi pi-users"></i>
              <span>容量：{{ room.capacity }}人</span>
            </div>
            <div class="flex items-center gap-2 text-gray-600">
              <i class="pi pi-clock"></i>
              <span class="font-medium">营业时间：</span>
            </div>
            <div class="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg font-medium text-center">
              {{ room.operatingHours.start }} - {{ room.operatingHours.end }}
            </div>
          </div>
        </div>
      </div>

      <!-- 页面导航 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">新建页面导航</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NuxtLink
            to="/reservations"
            class="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-3"
          >
            <i class="pi pi-list text-blue-600 text-xl"></i>
            <div>
              <div class="font-medium text-blue-900">预约列表</div>
              <div class="text-sm text-blue-700">查看和管理所有预约记录</div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/rooms/availability"
            class="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors flex items-center gap-3"
          >
            <i class="pi pi-clock text-green-600 text-xl"></i>
            <div>
              <div class="font-medium text-green-900">会议室可用时间</div>
              <div class="text-sm text-green-700">查看各会议室的时间安排</div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/reservations/create"
            class="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-3"
          >
            <i class="pi pi-plus text-purple-600 text-xl"></i>
            <div>
              <div class="font-medium text-purple-900">新建预约</div>
              <div class="text-sm text-purple-700">创建新的会议室预约</div>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/test-reservation-public"
            class="p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors flex items-center gap-3"
          >
            <i class="pi pi-external-link text-orange-600 text-xl"></i>
            <div>
              <div class="font-medium text-orange-900">公开测试页面</div>
              <div class="text-sm text-orange-700">无需登录即可测试</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- 测试说明 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <h2 class="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          测试说明
        </h2>
        <div class="text-sm text-blue-800 space-y-2">
          <p>✅ 时间选择器现在根据会议室营业时间显示时间段，不再从下午4点开始</p>
          <p>✅ 新增预约列表页面，可以查看、筛选和管理所有预约记录</p>
          <p>✅ 新增会议室可用时间页面，可以查看各会议室的详细时间安排</p>
          <p>✅ 所有页面之间都有完整的导航链接</p>
          <p>📝 如需登录测试，请使用系统的认证功能</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-page {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>