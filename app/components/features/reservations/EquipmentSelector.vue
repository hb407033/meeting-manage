<template>
  <div class="equipment-selector">
    <!-- 组件标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="pi pi-cog mr-2 text-blue-600"></i>
        设备需求配置
      </h3>
      <Button
        v-if="selectedEquipment.length > 0"
        icon="pi pi-times"
        label="清空选择"
        class="p-button-text p-button-sm"
        @click="clearSelection"
      />
    </div>

    <!-- 可用设备列表 -->
    <div class="equipment-list">
      <div
        v-for="category in equipmentCategories"
        :key="category.id"
        class="category-section mb-6"
      >
        <div class="category-header flex items-center mb-3">
          <i :class="category.icon" class="mr-2 text-gray-600"></i>
          <h4 class="font-medium text-gray-800">{{ category.name }}</h4>
          <span class="ml-auto text-sm text-gray-500">
            {{ getCategorySelectedCount(category.id) }}/{{ category.items.length }} 选中
          </span>
        </div>

        <div class="equipment-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="equipment in category.items"
            :key="equipment.id"
            class="equipment-item"
            :class="{
              'selected': isEquipmentSelected(equipment.id),
              'unavailable': !equipment.available,
              'limited': equipment.quantity !== undefined && equipment.quantity <= 0
            }"
            @click="toggleEquipment(equipment)"
          >
            <!-- 设备卡片内容 -->
            <div class="equipment-card p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md">
              <!-- 设备状态指示器 -->
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                  <Checkbox
                    :binary="true"
                    :modelValue="isEquipmentSelected(equipment.id)"
                    :disabled="!equipment.available || (equipment.quantity !== undefined && equipment.quantity <= 0)"
                    @click.stop
                  />
                  <i :class="equipment.icon" class="ml-2 text-lg" :style="{ color: equipment.color || '#6b7280' }"></i>
                </div>
                <span
                  v-if="equipment.status"
                  class="status-badge text-xs px-2 py-1 rounded-full"
                  :class="getStatusClass(equipment.status)"
                >
                  {{ getStatusText(equipment.status) }}
                </span>
              </div>

              <!-- 设备信息 -->
              <div class="equipment-info">
                <h5 class="font-medium text-gray-800 mb-1">{{ equipment.name }}</h5>
                <p class="text-sm text-gray-600 mb-2">{{ equipment.description }}</p>

                <!-- 数量选择 -->
                <div v-if="equipment.quantity !== undefined" class="quantity-control">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500">数量</span>
                    <div class="flex items-center gap-2">
                      <Button
                        icon="pi pi-minus"
                        size="small"
                        class="p-button-text p-button-rounded"
                        :disabled="getSelectedQuantity(equipment.id) <= 1"
                        @click.stop="decreaseQuantity(equipment.id)"
                      />
                      <span class="quantity-display w-8 text-center">
                        {{ getSelectedQuantity(equipment.id) }}
                      </span>
                      <Button
                        icon="pi pi-plus"
                        size="small"
                        class="p-button-text p-button-rounded"
                        :disabled="getSelectedQuantity(equipment.id) >= equipment.quantity"
                        @click.stop="increaseQuantity(equipment.id)"
                      />
                    </div>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    可用: {{ equipment.quantity }} {{ equipment.unit || '个' }}
                  </div>
                </div>

                <!-- 费用信息 -->
                <div v-if="equipment.cost" class="cost-info mt-2">
                  <div class="text-sm text-gray-500">
                    费用: ¥{{ equipment.cost.toFixed(2) }}
                    <span v-if="equipment.costType">{{ getCostTypeText(equipment.costType) }}</span>
                  </div>
                </div>
              </div>

              <!-- 状态覆盖层 -->
              <div
                v-if="!equipment.available || (equipment.quantity !== undefined && equipment.quantity <= 0)"
                class="status-overlay"
              >
                <div class="status-message">
                  <i class="pi pi-lock text-2xl mb-1"></i>
                  <p class="text-sm">{{ getUnavailableReason(equipment) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 选中设备汇总 -->
    <div v-if="selectedEquipment.length > 0" class="selection-summary">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>已选择设备 ({{ selectedEquipment.length }}项)</span>
            <span class="text-lg font-semibold text-blue-600">
              总费用: ¥{{ totalCost.toFixed(2) }}
            </span>
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="item in selectedEquipment"
              :key="item.equipment.id"
              class="selected-item flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div class="flex items-center">
                <i :class="item.equipment.icon" class="mr-2" :style="{ color: item.equipment.color || '#6b7280' }"></i>
                <span class="text-sm">{{ item.equipment.name }}</span>
                <span v-if="item.quantity > 1" class="ml-1 text-xs text-gray-500">
                  ({{ item.quantity }})
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">
                  ¥{{ (item.equipment.cost! * item.quantity).toFixed(2) }}
                </span>
                <Button
                  icon="pi pi-times"
                  size="small"
                  class="p-button-text p-button-rounded"
                  @click="removeEquipment(item.equipment.id)"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 冲突提示 -->
    <div v-if="conflicts.length > 0" class="conflicts-alert mt-4">
      <Message severity="warn" :closable="false">
        <div class="flex items-start">
          <i class="pi pi-exclamation-triangle mr-2 mt-1"></i>
          <div>
            <h5 class="font-medium mb-2">设备可用性提醒</h5>
            <ul class="text-sm space-y-1">
              <li v-for="conflict in conflicts" :key="conflict.equipmentId">
                {{ conflict.equipmentName }}: {{ conflict.message }}
              </li>
            </ul>
          </div>
        </div>
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { MeetingRoom } from '~/types/database'

// Props
interface Props {
  roomId?: string
  selectedDate?: Date
  selectedTimeSlot?: {
    startTime: Date
    endTime: Date
  }
  initialSelection?: EquipmentSelection[]
}

const props = withDefaults(defineProps<Props>(), {
  roomId: '',
  selectedDate: () => new Date(),
  initialSelection: () => []
})

// Emits
const emit = defineEmits<{
  selectionChange: [selection: EquipmentSelection[]]
  conflictDetected: [conflicts: EquipmentConflict[]]
}>()

// 响应式数据
const selectedEquipment = ref<EquipmentSelection[]>([])
const conflicts = ref<EquipmentConflict[]>([])

// 设备数据结构
interface Equipment {
  id: string
  name: string
  description: string
  icon: string
  color?: string
  available: boolean
  status?: 'available' | 'maintenance' | 'in-use' | 'reserved'
  quantity?: number
  unit?: string
  cost?: number
  costType?: 'per-hour' | 'per-day' | 'per-use'
  category: string
}

interface EquipmentCategory {
  id: string
  name: string
  icon: string
  items: Equipment[]
}

interface EquipmentSelection {
  equipment: Equipment
  quantity: number
  selectedAt: Date
}

interface EquipmentConflict {
  equipmentId: string
  equipmentName: string
  type: 'unavailable' | 'insufficient_quantity' | 'time_conflict'
  message: string
}

// 设备分类数据
const equipmentCategories = ref<EquipmentCategory[]>([
  {
    id: 'presentation',
    name: '演示设备',
    icon: 'pi pi-desktop',
    items: [
      {
        id: 'projector',
        name: '投影仪',
        description: '高清投影仪，支持1080P',
        icon: 'pi pi-video',
        color: '#3b82f6',
        available: true,
        quantity: 5,
        unit: '台',
        cost: 50,
        costType: 'per-hour',
        category: 'presentation'
      },
      {
        id: 'whiteboard',
        name: '白板',
        description: '移动式白板，含记号笔',
        icon: 'pi pi-file-edit',
        color: '#10b981',
        available: true,
        quantity: 10,
        unit: '块',
        cost: 10,
        costType: 'per-day',
        category: 'presentation'
      },
      {
        id: 'flipchart',
        name: '翻页白板',
        description: 'A1尺寸翻页白板架',
        icon: 'pi pi-file',
        color: '#8b5cf6',
        available: true,
        quantity: 3,
        unit: '套',
        cost: 15,
        costType: 'per-day',
        category: 'presentation'
      }
    ]
  },
  {
    id: 'audio',
    name: '音频设备',
    icon: 'pi pi-volume-up',
    items: [
      {
        id: 'microphone',
        name: '无线麦克风',
        description: '手持式无线麦克风',
        icon: 'pi pi-microphone',
        color: '#ef4444',
        available: true,
        quantity: 8,
        unit: '支',
        cost: 20,
        costType: 'per-hour',
        category: 'audio'
      },
      {
        id: 'speakers',
        name: '音响系统',
        description: '专业级音响设备',
        icon: 'pi pi-volume-down',
        color: '#f59e0b',
        available: true,
        quantity: 4,
        unit: '套',
        cost: 30,
        costType: 'per-hour',
        category: 'audio'
      },
      {
        id: 'conference-phone',
        name: '会议电话',
        description: '多方通话会议电话',
        icon: 'pi pi-phone',
        color: '#06b6d4',
        available: true,
        status: 'maintenance',
        quantity: 2,
        unit: '台',
        cost: 25,
        costType: 'per-hour',
        category: 'audio'
      }
    ]
  },
  {
    id: 'network',
    name: '网络设备',
    icon: 'pi pi-wifi',
    items: [
      {
        id: 'wifi-booster',
        name: 'WiFi增强器',
        description: '会议室专用WiFi信号增强',
        icon: 'pi pi-mobile',
        color: '#22c55e',
        available: true,
        quantity: 6,
        unit: '台',
        cost: 5,
        costType: 'per-day',
        category: 'network'
      },
      {
        id: 'ethernet-cable',
        name: '网线',
        description: '超五类网线连接',
        icon: 'pi pi-link',
        color: '#3b82f6',
        available: true,
        quantity: 20,
        unit: '条',
        cost: 2,
        costType: 'per-use',
        category: 'network'
      }
    ]
  },
  {
    id: 'comfort',
    name: '舒适设备',
    icon: 'pi pi-heart',
    items: [
      {
        id: 'air-conditioner',
        name: '空调',
        description: '中央空调控制',
        icon: 'pi pi-sun',
        color: '#0ea5e9',
        available: true,
        cost: 0,
        category: 'comfort'
      },
      {
        id: 'lighting',
        name: '智能照明',
        description: '可调节亮度LED照明',
        icon: 'pi pi-lightbulb',
        color: '#fbbf24',
        available: true,
        cost: 0,
        category: 'comfort'
      }
    ]
  }
])

// 计算属性
const totalCost = computed(() => {
  return selectedEquipment.value.reduce((total, item) => {
    const cost = item.equipment.cost || 0
    return total + (cost * item.quantity)
  }, 0)
})

// 方法
const isEquipmentSelected = (equipmentId: string) => {
  return selectedEquipment.value.some(item => item.equipment.id === equipmentId)
}

const getSelectedQuantity = (equipmentId: string) => {
  const item = selectedEquipment.value.find(item => item.equipment.id === equipmentId)
  return item ? item.quantity : 0
}

const getCategorySelectedCount = (categoryId: string) => {
  return selectedEquipment.value.filter(item => item.equipment.category === categoryId).length
}

const toggleEquipment = (equipment: Equipment) => {
  if (!equipment.available || (equipment.quantity !== undefined && equipment.quantity <= 0)) {
    return
  }

  const existingIndex = selectedEquipment.value.findIndex(item => item.equipment.id === equipment.id)

  if (existingIndex >= 0) {
    // 移除设备
    selectedEquipment.value.splice(existingIndex, 1)
  } else {
    // 添加设备
    selectedEquipment.value.push({
      equipment,
      quantity: equipment.quantity !== undefined ? 1 : 0,
      selectedAt: new Date()
    })
  }

  checkConflicts()
  emitSelectionChange()
}

const increaseQuantity = (equipmentId: string) => {
  const item = selectedEquipment.value.find(item => item.equipment.id === equipmentId)
  if (item && item.equipment.quantity && item.quantity < item.equipment.quantity) {
    item.quantity++
    emitSelectionChange()
  }
}

const decreaseQuantity = (equipmentId: string) => {
  const item = selectedEquipment.value.find(item => item.equipment.id === equipmentId)
  if (item && item.quantity > 1) {
    item.quantity--
    emitSelectionChange()
  }
}

const removeEquipment = (equipmentId: string) => {
  const index = selectedEquipment.value.findIndex(item => item.equipment.id === equipmentId)
  if (index >= 0) {
    selectedEquipment.value.splice(index, 1)
    checkConflicts()
    emitSelectionChange()
  }
}

const clearSelection = () => {
  selectedEquipment.value = []
  conflicts.value = []
  emitSelectionChange()
}

const getStatusClass = (status?: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800'
    case 'maintenance':
      return 'bg-red-100 text-red-800'
    case 'in-use':
      return 'bg-yellow-100 text-yellow-800'
    case 'reserved':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status?: string) => {
  switch (status) {
    case 'available':
      return '可用'
    case 'maintenance':
      return '维护中'
    case 'in-use':
      return '使用中'
    case 'reserved':
      return '已预留'
    default:
      return '未知'
  }
}

const getCostTypeText = (type?: string) => {
  switch (type) {
    case 'per-hour':
      return '/小时'
    case 'per-day':
      return '/天'
    case 'per-use':
      return '/次'
    default:
      return ''
  }
}

const getUnavailableReason = (equipment: Equipment) => {
  if (!equipment.available) {
    return '设备不可用'
  }
  if (equipment.quantity !== undefined && equipment.quantity <= 0) {
    return '库存不足'
  }
  if (equipment.status === 'maintenance') {
    return '维护中'
  }
  return '不可用'
}

const checkConflicts = async () => {
  conflicts.value = []

  // 模拟检查设备冲突的逻辑
  for (const item of selectedEquipment.value) {
    const equipment = item.equipment

    // 检查设备状态冲突
    if (equipment.status === 'maintenance') {
      conflicts.value.push({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        type: 'unavailable',
        message: '设备正在维护中，无法预约'
      })
    }

    // 检查数量冲突
    if (equipment.quantity !== undefined && item.quantity > equipment.quantity) {
      conflicts.value.push({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        type: 'insufficient_quantity',
        message: `需要 ${item.quantity} 个，但只有 ${equipment.quantity} 个可用`
      })
    }
  }

  emit('conflictDetected', conflicts.value)
}

const emitSelectionChange = () => {
  emit('selectionChange', [...selectedEquipment.value])
}

// 初始化
onMounted(() => {
  // 设置初始选择
  if (props.initialSelection.length > 0) {
    selectedEquipment.value = [...props.initialSelection]
  }

  // 初始冲突检查
  checkConflicts()
})

// 监听时间变化，检查冲突
watch(
  () => [props.selectedDate, props.selectedTimeSlot],
  () => {
    checkConflicts()
  },
  { deep: true }
)
</script>

<style scoped>
.equipment-selector {
  max-width: 100%;
}

.category-section {
  border-left: 3px solid #e5e7eb;
  padding-left: 1rem;
}

.equipment-item {
  transition: all 0.2s ease;
}

.equipment-item:hover .equipment-card {
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.equipment-item.selected .equipment-card {
  border-color: #3b82f6;
  background-color: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.equipment-item.unavailable .equipment-card {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f9fafb;
}

.equipment-item.limited .equipment-card {
  opacity: 0.8;
  border-color: #f59e0b;
}

.equipment-card {
  position: relative;
  min-height: 160px;
  border: 1px solid #d1d5db;
  background-color: white;
}

.status-badge {
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(243, 244, 246, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
}

.status-message {
  text-align: center;
  color: #6b7280;
}

.quantity-control {
  border-top: 1px solid #f3f4f6;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.quantity-display {
  font-weight: 500;
  color: #1f2937;
}

.selection-summary {
  margin-top: 1.5rem;
}

.conflicts-alert {
  margin-top: 1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .equipment-grid {
    grid-template-columns: 1fr !important;
  }

  .category-section {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid #e5e7eb;
    padding-top: 1rem;
  }
}
</style>