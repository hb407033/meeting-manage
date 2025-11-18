<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import SimpleCalendarView from '~/components/features/reservations/SimpleCalendarView.vue'
import CalendarToolbar from '~/components/features/reservations/CalendarToolbar.vue'
import RoomAvailabilityIndicator from '~/components/features/reservations/RoomAvailabilityIndicator.vue'
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelector.vue'
import CalendarFilter from '~/components/features/reservations/CalendarFilter.vue'
import MultiRoomComparison from '~/components/features/reservations/MultiRoomComparison.vue'
import TimeSuggestionPanel from '~/components/features/reservations/TimeSuggestionPanel.vue'

// 页面配置
definePageMeta({
  layout: 'default',
  title: '日历组件测试',
  description: '测试日历视图组件的性能和功能'
})

// 响应式数据
const calendarRef = ref()
const currentView = ref('dayGridWeek')
const currentDate = ref(new Date())
const currentRange = ref({ start: new Date(), end: new Date() })
const loading = ref(false)
const selectedRoomIds = ref(['1', '2', '3'])

// 新增交互功能相关状态
const activeTab = ref('calendar') // calendar, selector, filter, comparison, suggestions
const selectedTimeSlots = ref([])
const selectedFilters = ref({})
const selectedSuggestion = ref(null)

// 性能监控
const performanceMetrics = ref({
  pageLoadTime: 0,
  calendarInitTime: 0,
  renderTime: 0
})

// 模拟会议室数据
const mockRooms = ref([
  {
    id: '1',
    name: '会议室 A',
    type: '标准会议室',
    status: 'available',
    capacity: 10,
    location: '1楼东侧',
    floor: '1',
    equipment: ['投影仪', '白板', '音响'],
    features: ['WiFi', '空调', '自然光'],
    description: '适合小型团队会议的标准会议室'
  },
  {
    id: '2',
    name: '会议室 B',
    type: '视频会议室',
    status: 'available',
    capacity: 6,
    location: '2楼西侧',
    floor: '2',
    equipment: ['电视', '电话会议', '摄像头'],
    features: ['WiFi', '空调', '隔音'],
    description: '配备视频会议设备的专用会议室'
  },
  {
    id: '3',
    name: '会议室 C',
    type: '大会议室',
    status: 'available',
    capacity: 20,
    location: '3楼中央',
    floor: '3',
    equipment: ['投影仪', '音响', '白板', '麦克风'],
    features: ['WiFi', '空调', '舞台', '录音设备'],
    description: '可容纳20人的大型会议室'
  },
  {
    id: '4',
    name: '培训室 D',
    type: '培训室',
    status: 'maintenance',
    capacity: 15,
    location: '4楼北侧',
    floor: '4',
    equipment: ['投影仪', '音响', '白板'],
    features: ['WiFi', '空调', '灵活布局'],
    description: '适合培训和研讨的多功能培训室'
  },
  {
    id: '5',
    name: '讨论室 E',
    type: '讨论室',
    status: 'available',
    capacity: 4,
    location: '1楼西侧',
    floor: '1',
    equipment: ['白板'],
    features: ['WiFi', '安静环境'],
    description: '适合小组讨论的小型会议室'
  }
])

// 模拟时间段数据
const mockTimeSlots = ref([
  {
    id: 'slot-1',
    startTime: new Date('2025-11-18T09:00:00'),
    endTime: new Date('2025-11-18T09:30:00'),
    status: 'available',
    roomId: '1'
  },
  {
    id: 'slot-2',
    startTime: new Date('2025-11-18T09:30:00'),
    endTime: new Date('2025-11-18T10:00:00'),
    status: 'available',
    roomId: '1'
  },
  {
    id: 'slot-3',
    startTime: new Date('2025-11-18T10:00:00'),
    endTime: new Date('2025-11-18T10:30:00'),
    status: 'unavailable',
    roomId: '1',
    reservationId: 'res-1',
    conflictInfo: {
      type: 'time_overlap',
      description: '时间重叠冲突'
    }
  },
  {
    id: 'slot-4',
    startTime: new Date('2025-11-18T10:30:00'),
    endTime: new Date('2025-11-18T11:00:00'),
    status: 'available',
    roomId: '1'
  },
  {
    id: 'slot-5',
    startTime: new Date('2025-11-18T14:00:00'),
    endTime: new Date('2025-11-18T14:30:00'),
    status: 'maintenance',
    roomId: '2'
  }
])

const mockRoomData = ref([
  {
    roomId: '1',
    roomName: '会议室 A',
    status: 'available',
    capacity: 10,
    equipment: ['投影仪', '白板', '音响'],
    availableSlots: [
      { startTime: '2025-11-18T09:00:00Z', endTime: '2025-11-18T12:00:00Z' },
      { startTime: '2025-11-18T14:00:00Z', endTime: '2025-11-18T18:00:00Z' }
    ],
    reservations: [
      { id: 'r1', title: '团队会议', startTime: '2025-11-18T13:00:00Z', endTime: '2025-11-18T14:00:00Z' }
    ]
  },
  {
    roomId: '2',
    roomName: '会议室 B',
    status: 'available',
    capacity: 6,
    equipment: ['电视', '电话会议'],
    reservations: [
      { id: 'r2', title: '客户会议', startTime: '2025-11-18T10:00:00Z', endTime: '2025-11-18T11:30:00Z' }
    ]
  },
  {
    roomId: '3',
    roomName: '会议室 C',
    status: 'available',
    capacity: 20,
    equipment: ['投影仪', '音响', '白板'],
    availableSlots: [
      { startTime: '2025-11-18T08:00:00Z', endTime: '2025-11-18T20:00:00Z' }
    ]
  }
])

// 方法
function handleViewChange(view: string) {
  currentView.value = view
  console.log('View changed to:', view)
}

function handleDateChange(direction: 'prev' | 'next' | 'today') {
  if (calendarRef.value?.calendarApi) {
    const api = calendarRef.value.calendarApi
    switch (direction) {
      case 'prev':
        api.prev()
        break
      case 'next':
        api.next()
        break
      case 'today':
        api.today()
        break
    }
  }
}

function handleRefresh() {
  loading.value = true
  // 模拟加载延迟
  setTimeout(() => {
    loading.value = false
    console.log('Calendar refreshed')
  }, 500)
}

function handleTimeSelect(selection: { start: Date; end: Date }) {
  console.log('Time selected:', selection)
}

function handleEventClick(info: { event: any; el: HTMLElement }) {
  console.log('Event clicked:', info)
}

function handleViewChangeFromCalendar(view: { type: string; start: Date; end: Date }) {
  currentView.value = view.type
  currentRange.value = { start: view.start, end: view.end }
}

function handleRoomSelect(roomId: string) {
  console.log('Room selected:', roomId)
  selectedRoomIds.value = [roomId]
}

// 新组件的事件处理方法
function handleTimeSlotSelect(slots: any[]) {
  console.log('Time slots selected:', slots)
  selectedTimeSlots.value = slots
}

function handleTimeSlotChange(selection: any[]) {
  console.log('Time slot selection changed:', selection)
  selectedTimeSlots.value = selection
}

function handleFilterChange(filters: any) {
  console.log('Filters changed:', filters)
  selectedFilters.value = filters
}

function handleFilterRoomSelect(roomIds: string[]) {
  console.log('Filter room selection:', roomIds)
  selectedRoomIds.value = roomIds
}

function handleFilterRoomToggle(roomId: string) {
  console.log('Filter room toggle:', roomId)
  const index = selectedRoomIds.value.indexOf(roomId)
  if (index > -1) {
    selectedRoomIds.value.splice(index, 1)
  } else {
    selectedRoomIds.value.push(roomId)
  }
}

function handleComparisonTimeSlotSelect(timeSlot: any) {
  console.log('Comparison time slot selected:', timeSlot)
  selectedTimeSlots.value = [timeSlot]
}

function handleComparisonRoomSelect(roomIds: string[]) {
  console.log('Comparison room selection:', roomIds)
  selectedRoomIds.value = roomIds
}

// 智能推荐相关事件处理
function handleSuggestionSelect(suggestion: any) {
  console.log('Suggestion selected:', suggestion)
  selectedSuggestion.value = suggestion

  // 自动设置选中会议室和时间段
  selectedRoomIds.value = [suggestion.roomId]
  selectedTimeSlots.value = [{
    id: suggestion.id,
    startTime: new Date(suggestion.startTime),
    endTime: new Date(suggestion.endTime),
    status: 'available',
    roomId: suggestion.roomId
  }]
}

function handleSuggestionReject(suggestionId: string) {
  console.log('Suggestion rejected:', suggestionId)
}

function handleSuggestionsPreferencesChange(preferences: any) {
  console.log('Suggestions preferences changed:', preferences)
}

// 性能测试
async function runPerformanceTest() {
  console.log('=== 日历组件性能测试 ===')

  const startTime = performance.now()

  // 等待组件完全渲染
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  const loadTime = performance.now() - startTime

  performanceMetrics.value.pageLoadTime = loadTime

  console.log(`页面加载时间: ${loadTime.toFixed(2)}ms`)

  // 测试视图切换性能
  const views = ['dayGridMonth', 'dayGridWeek', 'dayGridDay', 'timeGridWeek', 'timeGridDay']

  for (const view of views) {
    const viewStartTime = performance.now()
    handleViewChange(view)
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    const viewLoadTime = performance.now() - viewStartTime
    console.log(`视图 ${view} 切换时间: ${viewLoadTime.toFixed(2)}ms`)
  }

  // 测试大量事件渲染性能
  if (calendarRef.value) {
    const eventStartTime = performance.now()

    // 生成大量测试事件
    const testEvents = Array.from({ length: 100 }, (_, i) => ({
      id: `test-${i}`,
      title: `测试事件 ${i + 1}`,
      start: new Date(2025, 10, 18, Math.floor(i / 4), (i % 4) * 15),
      end: new Date(2025, 10, 18, Math.floor(i / 4), ((i % 4) * 15) + 30),
      backgroundColor: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#ef4444' : '#f59e0b'
    }))

    calendarRef.value.updateEvents(testEvents)
    await nextTick()

    const eventLoadTime = performance.now() - eventStartTime
    console.log(`渲染 ${testEvents.length} 个事件耗时: ${eventLoadTime.toFixed(2)}ms`)

    performanceMetrics.value.renderTime = eventLoadTime
  }

  console.log('=== 性能测试完成 ===')
}

// 生命周期
onMounted(async () => {
  const startTime = performance.now()

  // 等待组件挂载
  await nextTick()

  const mountTime = performance.now() - startTime
  performanceMetrics.value.calendarInitTime = mountTime

  console.log(`日历组件初始化时间: ${mountTime.toFixed(2)}ms`)

  // 自动运行性能测试
  setTimeout(() => {
    runPerformanceTest()
  }, 1000)
})

// SEO 和 Meta
useHead({
  title: '日历组件性能测试 - 智能会议室管理系统',
  meta: [
    { name: 'description', content: '测试 FullCalendar 组件的性能表现和响应时间' },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<template>
  <div class="test-calendar-page">
    <div class="container mx-auto px-4 py-8">
      <!-- 页面标题 -->
      <div class="page-header mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">日历与交互功能测试</h1>
        <p class="text-gray-600">测试日历组件的性能和交互功能表现</p>
      </div>

      <!-- 功能标签页 -->
      <div class="tab-navigation mb-6">
        <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            v-for="tab in [
              { key: 'calendar', label: '日历视图' },
              { key: 'selector', label: '时间选择器' },
              { key: 'filter', label: '会议室筛选' },
              { key: 'comparison', label: '多会议室对比' },
              { key: 'suggestions', label: '智能推荐' }
            ]"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- 性能指标显示 -->
      <div class="performance-metrics bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 class="text-lg font-semibold text-blue-900 mb-3">性能指标</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="metric-item">
            <div class="text-sm text-blue-700">页面加载时间</div>
            <div class="text-xl font-bold text-blue-900">
              {{ performanceMetrics.pageLoadTime.toFixed(2) }}ms
              <span v-if="performanceMetrics.pageLoadTime > 1000" class="text-red-600 text-sm ml-1">
                ⚠️ 超过1秒目标
              </span>
              <span v-else class="text-green-600 text-sm ml-1">
                ✅ 符合要求
              </span>
            </div>
          </div>
          <div class="metric-item">
            <div class="text-sm text-blue-700">组件初始化时间</div>
            <div class="text-xl font-bold text-blue-900">
              {{ performanceMetrics.calendarInitTime.toFixed(2) }}ms
              <span v-if="performanceMetrics.calendarInitTime > 500" class="text-yellow-600 text-sm ml-1">
                ⚠️ 较慢
              </span>
              <span v-else class="text-green-600 text-sm ml-1">
                ✅ 良好
              </span>
            </div>
          </div>
          <div class="metric-item">
            <div class="text-sm text-blue-700">事件渲染时间</div>
            <div class="text-xl font-bold text-blue-900">
              {{ performanceMetrics.renderTime.toFixed(2) }}ms
              <span v-if="performanceMetrics.renderTime > 200" class="text-yellow-600 text-sm ml-1">
                ⚠️ 较慢
              </span>
              <span v-else class="text-green-600 text-sm ml-1">
                ✅ 良好
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar-section mb-6">
        <CalendarToolbar
          :current-view="currentView"
          :current-date="currentDate"
          :current-range="currentRange"
          :loading="loading"
          @view-change="handleViewChange"
          @date-change="handleDateChange"
          @refresh="handleRefresh"
        />
      </div>

      <!-- 功能内容区域 -->
      <div class="tab-content mb-6">
        <!-- 日历视图标签页 -->
        <div v-if="activeTab === 'calendar'" class="calendar-section">
          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">日历视图</h2>
            <SimpleCalendarView
              :room-ids="selectedRoomIds"
              :view-mode="currentView"
              :height="600"
              :selectable="true"
              :event-limit="true"
              @time-select="handleTimeSelect"
              @event-click="handleEventClick"
              @view-change="handleViewChangeFromCalendar"
            />
          </div>
        </div>

        <!-- 时间选择器标签页 -->
        <div v-if="activeTab === 'selector'" class="selector-section">
          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">时间段选择器</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 class="text-md font-medium text-gray-800 mb-3">交互式时间选择</h3>
                <TimeSlotSelector
                  :available-slots="mockTimeSlots"
                  :selected-slots="selectedTimeSlots"
                  :allow-drag-selection="true"
                  :allow-multiple-selection="true"
                  :min-selection-duration="30"
                  :max-selection-duration="240"
                  :time-slot-duration="30"
                  :show-reservation-details="true"
                  @slot-select="handleTimeSlotSelect"
                  @slot-deselect="handleTimeSlotSelect"
                  @selection-change="handleTimeSlotChange"
                  @selection-complete="handleTimeSlotSelect"
                />
              </div>
              <div class="selection-summary">
                <h3 class="text-md font-medium text-gray-800 mb-3">选择状态</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">已选择时间段:</span>
                      <span class="text-sm font-medium">{{ selectedTimeSlots.length }} 个</span>
                    </div>
                    <div v-if="selectedTimeSlots.length > 0" class="space-y-1">
                      <div
                        v-for="(slot, index) in selectedTimeSlots"
                        :key="index"
                        class="text-xs bg-blue-100 text-blue-800 p-2 rounded"
                      >
                        {{ slot.startTime?.toLocaleTimeString() }} - {{ slot.endTime?.toLocaleTimeString() }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 会议室筛选标签页 -->
        <div v-if="activeTab === 'filter'" class="filter-section">
          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">会议室筛选器</h2>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="lg:col-span-2">
                <CalendarFilter
                  :rooms="mockRooms"
                  :selected-room-ids="selectedRoomIds"
                  :show-advanced-filters="true"
                  :max-visible-rooms="10"
                  :allow-multiple-selection="true"
                  :compact-mode="false"
                  @filter-change="handleFilterChange"
                  @room-select="handleFilterRoomSelect"
                  @room-toggle="handleFilterRoomToggle"
                  @clear-filters="() => selectedFilters = {}"
                  @search="(query) => console.log('Search:', query)"
                />
              </div>
              <div class="filter-summary">
                <h3 class="text-md font-medium text-gray-800 mb-3">筛选状态</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span class="text-sm text-gray-600">选中会议室:</span>
                    <div class="mt-1 space-y-1">
                      <div
                        v-for="roomId in selectedRoomIds"
                        :key="roomId"
                        class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {{ mockRooms.find(r => r.id === roomId)?.name || roomId }}
                      </div>
                    </div>
                  </div>
                  <div v-if="Object.keys(selectedFilters).length > 0">
                    <span class="text-sm text-gray-600">活跃过滤器:</span>
                    <div class="mt-1">
                      <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {{ Object.keys(selectedFilters).length }} 个过滤器
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 多会议室对比标签页 -->
        <div v-if="activeTab === 'comparison'" class="comparison-section">
          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">多会议室对比</h2>
            <MultiRoomComparison
              :rooms="mockRooms.filter(room => selectedRoomIds.includes(room.id))"
              :selected-date="currentDate"
              :time-range="currentRange"
              :slot-duration="30"
              :show-reservation-details="true"
              :enable-conflict-detection="true"
              :max-rooms-visible="4"
              @time-slot-select="handleComparisonTimeSlotSelect"
              @room-select="handleComparisonRoomSelect"
              @date-change="(date) => currentDate = date"
              @time-range-change="(range) => currentRange = range"
            />
          </div>
        </div>

        <!-- 智能推荐标签页 -->
        <div v-if="activeTab === 'suggestions'" class="suggestions-section">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 智能推荐面板 -->
            <div class="lg:col-span-2">
              <TimeSuggestionPanel
                :rooms="mockRooms"
                :date="currentDate"
                :max-suggestions="8"
                :enable-personalization="true"
                :show-alternatives="true"
                :algorithms="['usage-pattern', 'equipment-match', 'location-proximity', 'time-preference']"
                @suggestion-select="handleSuggestionSelect"
                @suggestion-reject="handleSuggestionReject"
                @preferences-change="handleSuggestionsPreferencesChange"
                @refresh="() => console.log('Refresh suggestions')"
              />
            </div>

            <!-- 选中建议详情 -->
            <div class="suggestion-details">
              <div class="bg-white rounded-lg shadow-md p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">选中建议</h3>

                <div v-if="selectedSuggestion" class="space-y-4">
                  <div class="selected-suggestion bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-medium text-blue-900">{{ selectedSuggestion.roomName }}</h4>
                      <span class="text-sm font-bold text-blue-700">{{ selectedSuggestion.score }}% 匹配</span>
                    </div>

                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">时间:</span>
                        <span class="font-medium">
                          {{ new Date(selectedSuggestion.startTime).toLocaleTimeString() }} -
                          {{ new Date(selectedSuggestion.endTime).toLocaleTimeString() }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">时长:</span>
                        <span class="font-medium">
                          {{ Math.round((new Date(selectedSuggestion.endTime).getTime() - new Date(selectedSuggestion.startTime).getTime()) / 60000) }}分钟
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">置信度:</span>
                        <span class="font-medium">{{ (selectedSuggestion.confidence * 100).toFixed(0) }}%</span>
                      </div>
                    </div>

                    <div v-if="selectedSuggestion.reasons" class="mt-3 pt-3 border-t border-blue-200">
                      <h5 class="text-sm font-medium text-blue-900 mb-2">推荐原因:</h5>
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="reason in selectedSuggestion.reasons"
                          :key="reason"
                          class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {{ reason }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 快速操作按钮 -->
                  <div class="quick-actions space-y-2">
                    <button class="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                      <i class="pi pi-calendar-plus mr-2"></i>
                      创建预约
                    </button>
                    <button class="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors">
                      <i class="pi pi-clock mr-2"></i>
                      查找其他时间
                    </button>
                  </div>
                </div>

                <div v-else class="empty-state text-center py-8">
                  <i class="pi pi-lightbulb text-4xl text-gray-300 mb-3"></i>
                  <p class="text-gray-500">尚未选择推荐</p>
                  <p class="text-sm text-gray-400 mt-1">
                    从左侧推荐中选择一个查看详情
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 会议室可用性指示器 -->
      <div class="availability-section mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">会议室可用性</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RoomAvailabilityIndicator
            v-for="room in mockRoomData"
            :key="room.roomId"
            :room-data="room"
            :time-range="currentRange"
            :show-details="true"
            :show-timeline="true"
            @room-select="handleRoomSelect"
          />
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="control-section bg-gray-50 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">测试控制</h2>
        <div class="space-y-4">
          <div>
            <button
              @click="runPerformanceTest"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              运行性能测试
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选中的会议室：
            </label>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="room in mockRoomData"
                :key="room.roomId"
                @click="handleRoomSelect(room.roomId)"
                :class="[
                  'px-3 py-1 rounded-full text-sm cursor-pointer transition-colors',
                  selectedRoomIds.includes(room.roomId)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                ]"
              >
                {{ room.roomName }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-calendar-page {
  @apply min-h-screen bg-gray-50;
}

.container {
  @apply max-w-7xl;
}

.page-header {
  @apply text-center;
}

.toolbar-section {
  @apply bg-white rounded-lg shadow-md p-4;
}

.calendar-section {
  @apply bg-white rounded-lg shadow-md;
}

.availability-section {
  @apply bg-white rounded-lg shadow-md p-4;
}

.control-section {
  @apply bg-white rounded-lg shadow-md;
}

.tab-content {
  @apply min-h-[600px];
}

.metric-item {
  @apply text-center p-3 bg-white bg-opacity-70 rounded-lg;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    @apply px-2;
  }

  .calendar-section {
    @apply p-2;
  }

  .availability-section {
    @apply p-2;
  }

  .control-section {
    @apply p-3;
  }
}
</style>