<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Props {
  currentView: string
  currentDate: Date
  currentRange: {
    start: Date
    end: Date
  }
  loading?: boolean
  availableViews?: string[]
  showDateNavigation?: boolean
  showViewSelector?: boolean
  showTodayButton?: boolean
  compact?: boolean
}

interface Emits {
  (e: 'viewChange', view: string): void
  (e: 'dateChange', direction: 'prev' | 'next' | 'today'): void
  (e: 'dateSelect', date: Date): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  availableViews: () => ['dayGridMonth', 'dayGridWeek', 'dayGridDay', 'timeGridWeek', 'timeGridDay'],
  showDateNavigation: true,
  showViewSelector: true,
  showTodayButton: true,
  compact: false
})

const emit = defineEmits<Emits>()

// 视图选项配置
const viewOptions = computed(() => [
  { value: 'dayGridMonth', label: '月视图', icon: 'pi pi-calendar' },
  { value: 'dayGridWeek', label: '周视图', icon: 'pi pi-calendar-plus' },
  { value: 'dayGridDay', label: '日视图', icon: 'pi pi-calendar-minus' },
  { value: 'timeGridWeek', label: '时间周视图', icon: 'pi pi-clock' },
  { value: 'timeGridDay', label: '时间日视图', icon: 'pi pi-clock' }
])

// 当前视图显示信息
const viewDisplayInfo = computed(() => {
  const { start, end } = props.currentRange
  const currentView = props.currentView

  switch (currentView) {
    case 'dayGridMonth':
      return format(start, 'yyyy年 MMMM', { locale: zhCN })
    case 'dayGridWeek':
    case 'timeGridWeek':
      return `${format(start, 'MM/dd', { locale: zhCN })} - ${format(end, 'MM/dd', { locale: zhCN })}`
    case 'dayGridDay':
    case 'timeGridDay':
      return format(start, 'yyyy年 MM月 dd日 EEEE', { locale: zhCN })
    default:
      return format(start, 'yyyy/MM/dd', { locale: zhCN })
  }
})

// 是否显示快速日期选择器
const showQuickDateSelector = ref(false)
const selectedQuickDate = ref('')

// 快速日期选项
const quickDateOptions = computed(() => [
  { value: 'today', label: '今天', date: new Date() },
  { value: 'tomorrow', label: '明天', date: addDays(new Date(), 1) },
  { value: 'thisWeek', label: '本周', date: startOfWeek(new Date(), { weekStartsOn: 1 }) },
  { value: 'nextWeek', label: '下周', date: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7) },
  { value: 'thisMonth', label: '本月', date: startOfMonth(new Date()) },
  { value: 'nextMonth', label: '下月', date: addDays(startOfMonth(new Date()), 30) }
])

// 方法
function handleViewChange(view: string) {
  emit('viewChange', view)
}

function handleDateNavigation(direction: 'prev' | 'next' | 'today') {
  emit('dateChange', direction)
}

function handleRefresh() {
  emit('refresh')
}

function handleQuickDateSelect(optionValue: string) {
  const option = quickDateOptions.value.find(opt => opt.value === optionValue)
  if (option) {
    emit('dateSelect', option.date)
    selectedQuickDate.value = ''
    showQuickDateSelector.value = false
  }
}

function goToToday() {
  handleDateNavigation('today')
}

function goPrev() {
  handleDateNavigation('prev')
}

function goNext() {
  handleDateNavigation('next')
}

function toggleQuickDateSelector() {
  showQuickDateSelector.value = !showQuickDateSelector.value
}

// 键盘快捷键处理
function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        goPrev()
        break
      case 'ArrowRight':
        event.preventDefault()
        goNext()
        break
      case 'Home':
        event.preventDefault()
        goToToday()
        break
      case 'r':
      case 'R':
        event.preventDefault()
        handleRefresh()
        break
    }
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="calendar-toolbar">
    <div class="toolbar-content" :class="{ 'compact': compact }">
      <!-- 左侧：日期导航 -->
      <div v-if="showDateNavigation" class="toolbar-left">
        <!-- 导航按钮 -->
        <div class="date-navigation">
          <button
            @click="goPrev"
            :disabled="loading"
            class="nav-button"
            title="上一页 (Ctrl+←)"
          >
            <i class="pi pi-chevron-left"></i>
          </button>

          <button
            v-if="showTodayButton"
            @click="goToToday"
            :disabled="loading"
            class="today-button"
            title="今天 (Ctrl+Home)"
          >
            今天
          </button>

          <button
            @click="goNext"
            :disabled="loading"
            class="nav-button"
            title="下一页 (Ctrl+→)"
          >
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>

        <!-- 快速日期选择器 -->
        <div class="quick-date-selector" v-if="!compact">
          <div class="relative">
            <button
              @click="toggleQuickDateSelector"
              :disabled="loading"
              class="quick-date-button"
              title="快速选择日期"
            >
              <i class="pi pi-calendar"></i>
              <i class="pi pi-chevron-down text-xs"></i>
            </button>

            <!-- 快速日期下拉菜单 -->
            <div
              v-show="showQuickDateSelector"
              class="quick-date-dropdown"
              @click.stop
            >
              <div
                v-for="option in quickDateOptions"
                :key="option.value"
                @click="handleQuickDateSelect(option.value)"
                class="quick-date-option"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：标题和当前时间 -->
      <div class="toolbar-center">
        <div class="calendar-title">
          <h2 class="title-text">{{ viewDisplayInfo }}</h2>
        </div>

        <!-- 加载状态指示器 -->
        <div v-if="loading" class="loading-indicator">
          <i class="pi pi-spin pi-spinner text-blue-500"></i>
          <span class="ml-1 text-sm text-gray-600">加载中...</span>
        </div>
      </div>

      <!-- 右侧：视图选择和操作 -->
      <div class="toolbar-right">
        <!-- 视图选择器 -->
        <div v-if="showViewSelector" class="view-selector">
          <div class="view-buttons">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              @click="handleViewChange(option.value)"
              :disabled="loading"
              :class="[
                'view-button',
                { 'active': currentView === option.value }
              ]"
              :title="option.label"
            >
              <i :class="option.icon"></i>
              <span v-if="!compact">{{ option.label }}</span>
            </button>
          </div>
        </div>

        <!-- 刷新按钮 -->
        <button
          @click="handleRefresh"
          :disabled="loading"
          class="refresh-button"
          title="刷新 (Ctrl+R)"
        >
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
        </button>
      </div>
    </div>

    <!-- 快捷键提示（仅在紧凑模式显示） -->
    <div v-if="compact" class="keyboard-shortcuts-hint">
      <span class="text-xs text-gray-500">
        Ctrl+←/→ 导航 • Ctrl+Home 今天 • Ctrl+R 刷新
      </span>
    </div>
  </div>
</template>

<style scoped>
.calendar-toolbar {
  @apply bg-white border-b border-gray-200 px-4 py-3;
}

.toolbar-content {
  @apply flex items-center justify-between;
}

.toolbar-content.compact {
  @apply space-y-2;
}

/* 左侧区域 */
.toolbar-left {
  @apply flex items-center space-x-3;
}

.date-navigation {
  @apply flex items-center space-x-1;
}

.nav-button {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.nav-button:hover:not(:disabled) {
  @apply bg-gray-100 text-gray-900;
}

.today-button {
  @apply px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.today-button:hover:not(:disabled) {
  @apply bg-blue-100 text-blue-700;
}

.quick-date-selector {
  @apply relative;
}

.quick-date-button {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.quick-date-dropdown {
  @apply absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20;
}

.quick-date-option {
  @apply px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors duration-150;
}

.quick-date-option:first-child {
  @apply rounded-t-lg;
}

.quick-date-option:last-child {
  @apply rounded-b-lg;
}

/* 中间区域 */
.toolbar-center {
  @apply flex items-center space-x-4;
}

.calendar-title {
  @apply flex flex-col items-center;
}

.title-text {
  @apply text-lg font-semibold text-gray-900;
}

.loading-indicator {
  @apply flex items-center;
}

/* 右侧区域 */
.toolbar-right {
  @apply flex items-center space-x-3;
}

.view-selector {
  @apply flex items-center;
}

.view-buttons {
  @apply flex items-center space-x-1 bg-gray-100 rounded-lg p-1;
}

.view-button {
  @apply flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.view-button.active {
  @apply bg-white text-blue-600 shadow-sm;
}

.view-button:hover:not(:disabled):not(.active) {
  @apply text-gray-900;
}

.refresh-button {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.refresh-button:hover:not(:disabled) {
  @apply bg-gray-100 text-gray-900;
}

/* 快捷键提示 */
.keyboard-shortcuts-hint {
  @apply mt-2 text-center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .calendar-toolbar {
    @apply px-2 py-2;
  }

  .toolbar-content {
    @apply flex-col space-y-2;
  }

  .toolbar-left,
  .toolbar-right {
    @apply w-full justify-center;
  }

  .toolbar-center {
    @apply order-first;
  }

  .view-buttons {
    @apply flex-wrap justify-center;
  }

  .title-text {
    @apply text-base;
  }

  .keyboard-shortcuts-hint {
    @apply text-xs;
  }
}

@media (max-width: 480px) {
  .view-buttons {
    @apply flex-col w-full;
  }

  .view-button {
    @apply justify-center w-full;
  }

  .date-navigation {
    @apply w-full justify-center;
  }

  .quick-date-selector {
    @apply hidden;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .calendar-toolbar {
    @apply bg-gray-800 border-gray-700;
  }

  .title-text {
    @apply text-white;
  }

  .nav-button,
  .quick-date-button,
  .refresh-button {
    @apply text-gray-400 hover:text-gray-100 hover:bg-gray-700;
  }

  .today-button {
    @apply text-blue-400 bg-blue-900 hover:bg-blue-800;
  }

  .view-buttons {
    @apply bg-gray-700;
  }

  .view-button {
    @apply text-gray-400 hover:text-gray-100;
  }

  .view-button.active {
    @apply bg-gray-600 text-blue-400;
  }

  .quick-date-dropdown {
    @apply bg-gray-700 border-gray-600;
  }

  .quick-date-option {
    @apply text-gray-300 hover:bg-gray-600;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .nav-button,
  .quick-date-button,
  .refresh-button {
    @apply border-2 border-gray-400;
  }

  .view-button {
    @apply border-2 border-transparent;
  }

  .view-button.active {
    @apply border-blue-500;
  }
}

/* 动画效果 */
.quick-date-dropdown {
  @apply transform transition-all duration-200 origin-top-left;
}

.quick-date-dropdown[style*="display: block"] {
  @apply scale-100 opacity-100;
}

.quick-date-dropdown[style*="display: none"] {
  @apply scale-95 opacity-0;
}

/* 焦点样式 */
.nav-button:focus,
.today-button:focus,
.quick-date-button:focus,
.view-button:focus,
.refresh-button:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-1;
}

/* 加载状态样式 */
.loading-indicator {
  @apply animate-pulse;
}

/* 打印样式 */
@media print {
  .calendar-toolbar {
    @apply border-none print:hidden;
  }

  .toolbar-right,
  .toolbar-left {
    @apply hidden;
  }

  .toolbar-center {
    @apply w-full;
  }
}
</style>