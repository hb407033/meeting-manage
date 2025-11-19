<template>
  <div class="services-selector">
    <!-- 组件标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="pi pi-star mr-2 text-blue-600"></i>
        会议服务配置
      </h3>
      <Button
        v-if="selectedServices.length > 0"
        icon="pi pi-times"
        label="清空选择"
        class="p-button-text p-button-sm"
        @click="clearSelection"
      />
    </div>

    <!-- 服务分类 -->
    <div class="services-container">
      <div
        v-for="category in serviceCategories"
        :key="category.id"
        class="service-category mb-6"
      >
        <!-- 分类标题 -->
        <div class="category-header flex items-center mb-4">
          <i :class="category.icon" class="mr-2 text-gray-600"></i>
          <h4 class="font-medium text-gray-800">{{ category.name }}</h4>
          <span class="ml-auto text-sm text-gray-500">
            {{ getCategorySelectedCount(category.id) }} 项已选择
          </span>
        </div>

        <!-- 服务列表 -->
        <div class="services-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="service in category.services"
            :key="service.id"
            class="service-item"
            :class="{
              'selected': isServiceSelected(service.id),
              'disabled': !service.available || service.requiresApproval
            }"
          >
            <Card class="service-card cursor-pointer transition-all hover:shadow-md">
              <template #header>
                <div class="service-header p-3 bg-gradient-to-r" :style="getGradientStyle(service.category)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <Checkbox
                        :binary="true"
                        :modelValue="isServiceSelected(service.id)"
                        :disabled="!service.available"
                        @click.stop
                      />
                      <i :class="service.icon" class="ml-2 text-white text-lg"></i>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        v-if="service.popular"
                        class="popular-badge bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium"
                      >
                        热门
                      </span>
                      <span
                        v-if="!service.available"
                        class="unavailable-badge bg-red-500 text-white text-xs px-2 py-1 rounded-full"
                      >
                        不可用
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <template #content>
                <div @click="toggleService(service)">
                  <!-- 服务名称和描述 -->
                  <div class="service-info">
                    <h5 class="font-semibold text-gray-800 mb-2">{{ service.name }}</h5>
                    <p class="text-sm text-gray-600 mb-3">{{ service.description }}</p>

                    <!-- 服务特点 -->
                    <div v-if="service.features && service.features.length > 0" class="features-list mb-3">
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="feature in service.features"
                          :key="feature"
                          class="feature-tag bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                        >
                          {{ feature }}
                        </span>
                      </div>
                    </div>

                    <!-- 数量配置 -->
                    <div v-if="service.requiresQuantity" class="quantity-config mb-3">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-700">
                          {{ service.quantityLabel || '数量' }}
                        </label>
                        <div class="flex items-center gap-2">
                          <InputNumber
                            v-model="serviceQuantities[service.id]"
                            :min="service.minQuantity || 1"
                            :max="service.maxQuantity || 50"
                            size="small"
                            @click.stop
                          />
                          <span class="text-sm text-gray-500">{{ service.unit || '份' }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 时间配置 -->
                    <div v-if="service.timeOptions" class="time-config mb-3">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-700">服务时间</label>
                        <Dropdown
                          v-model="serviceTimeOptions[service.id]"
                          :options="service.timeOptions"
                          optionLabel="label"
                          optionValue="value"
                          size="small"
                          @click.stop
                        />
                      </div>
                    </div>

                    <!-- 费用信息 -->
                    <div class="cost-info">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-700">费用</span>
                        <div class="text-right">
                          <span class="text-lg font-semibold text-blue-600">
                            ¥{{ calculateServiceCost(service).toFixed(2) }}
                          </span>
                          <div class="text-xs text-gray-500">
                            {{ getCostDescription(service) }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 审批说明 -->
                    <div v-if="service.requiresApproval" class="approval-notice mt-3">
                      <Message severity="info" :closable="false">
                        <div class="flex items-center">
                          <i class="pi pi-info-circle mr-2"></i>
                          <span class="text-sm">此服务需要审批，请提前申请</span>
                        </div>
                      </Message>
                    </div>

                    <!-- 备注说明 -->
                    <div v-if="service.requiresNotes" class="notes-section mt-3">
                      <label class="text-sm font-medium text-gray-700 mb-1 block">
                        特殊要求备注
                      </label>
                      <Textarea
                        v-model="serviceNotes[service.id]"
                        :placeholder="service.notesPlaceholder || '请输入特殊要求...'"
                        rows="2"
                        class="w-full"
                        @click.stop
                      />
                    </div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- 选中服务汇总 -->
    <div v-if="selectedServices.length > 0" class="selection-summary">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>已选择服务 ({{ selectedServices.length }}项)</span>
            <div class="text-right">
              <span class="text-lg font-semibold text-blue-600">
                总费用: ¥{{ totalCost.toFixed(2) }}
              </span>
              <div v-if="totalDiscount > 0" class="text-sm text-green-600">
                已优惠: ¥{{ totalDiscount.toFixed(2) }}
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="space-y-3">
            <div
              v-for="item in selectedServices"
              :key="item.service.id"
              class="selected-service-item p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center mb-2">
                    <i :class="item.service.icon" class="mr-2" :style="{ color: getCategoryColor(item.service.category) }"></i>
                    <h6 class="font-medium text-gray-800">{{ item.service.name }}</h6>
                    <span v-if="item.quantity > 1" class="ml-2 text-sm text-gray-500">
                      ({{ item.quantity }}{{ item.service.unit || '份' }})
                    </span>
                  </div>

                  <!-- 服务配置显示 -->
                  <div v-if="item.config" class="config-details text-sm text-gray-600 mb-1">
                    <div v-if="item.config.timeOption" class="flex items-center">
                      <i class="pi pi-clock mr-1"></i>
                      {{ getTimeOptionText(item.config.timeOption, item.service.timeOptions) }}
                    </div>
                    <div v-if="item.config.notes" class="mt-1">
                      <i class="pi pi-comment mr-1"></i>
                      {{ item.config.notes }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <div class="text-right">
                    <div class="font-medium">
                      ¥{{ (item.service.baseCost * item.quantity + (item.config?.additionalCost || 0)).toFixed(2) }}
                    </div>
                    <div v-if="item.discount > 0" class="text-xs text-green-600">
                      -¥{{ item.discount.toFixed(2) }}
                    </div>
                  </div>
                  <Button
                    icon="pi pi-times"
                    size="small"
                    class="p-button-text p-button-rounded"
                    @click="removeService(item.service.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 服务提醒 -->
    <div v-if="serviceReminders.length > 0" class="reminders-section mt-4">
      <Message severity="info" :closable="false">
        <div class="space-y-2">
          <h5 class="font-medium mb-2">服务提醒</h5>
          <ul class="text-sm space-y-1">
            <li v-for="reminder in serviceReminders" :key="reminder.id" class="flex items-start">
              <i :class="reminder.icon" class="mr-2 mt-0.5"></i>
              <span>{{ reminder.message }}</span>
            </li>
          </ul>
        </div>
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

// Props
interface Props {
  roomId?: string
  attendeeCount?: number
  selectedDate?: Date
  selectedTimeSlot?: {
    startTime: Date
    endTime: Date
  }
  initialSelection?: ServiceSelection[]
}

const props = withDefaults(defineProps<Props>(), {
  roomId: '',
  attendeeCount: 1,
  selectedDate: () => new Date(),
  initialSelection: () => []
})

// Emits
const emit = defineEmits<{
  selectionChange: [selection: ServiceSelection[]]
  costChange: [totalCost: number, totalDiscount: number]
}>()

// 响应式数据
const selectedServices = ref<ServiceSelection[]>([])
const serviceQuantities = reactive<Record<string, number>>({})
const serviceTimeOptions = reactive<Record<string, string>>({})
const serviceNotes = reactive<Record<string, string>>({})

// 服务数据结构
interface Service {
  id: string
  name: string
  description: string
  icon: string
  category: string
  available: boolean
  popular?: boolean
  requiresQuantity?: boolean
  quantityLabel?: string
  unit?: string
  minQuantity?: number
  maxQuantity?: number
  requiresNotes?: boolean
  notesPlaceholder?: string
  baseCost: number
  costType?: 'per-person' | 'per-hour' | 'per-day' | 'flat-rate'
  timeOptions?: { label: string; value: string; cost?: number }[]
  features?: string[]
  requiresApproval?: boolean
  leadTime?: number // 提前申请时间（小时）
}

interface ServiceCategory {
  id: string
  name: string
  icon: string
  services: Service[]
}

interface ServiceSelection {
  service: Service
  quantity: number
  config: {
    timeOption?: string
    notes?: string
    additionalCost?: number
  }
  selectedAt: Date
  discount?: number
}

interface ServiceReminder {
  id: string
  icon: string
  message: string
}

// 服务分类数据
const serviceCategories = ref<ServiceCategory[]>([
  {
    id: 'catering',
    name: '餐饮服务',
    icon: 'pi pi-pizza',
    services: [
      {
        id: 'tea-service',
        name: '茶水服务',
        description: '提供中式茶水、咖啡、小点心等饮品',
        icon: 'pi pi-star',
        category: 'catering',
        available: true,
        popular: true,
        requiresQuantity: true,
        quantityLabel: '人数',
        unit: '人',
        minQuantity: 1,
        maxQuantity: 100,
        baseCost: 15,
        costType: 'per-person',
        features: ['绿茶', '红茶', '咖啡', '小点心'],
        leadTime: 2
      },
      {
        id: 'lunch-box',
        name: '商务简餐',
        description: '提供营养均衡的商务简餐',
        icon: 'pi pi-apple',
        category: 'catering',
        available: true,
        requiresQuantity: true,
        quantityLabel: '份数',
        unit: '份',
        minQuantity: 5,
        maxQuantity: 50,
        baseCost: 35,
        costType: 'per-person',
        features: ['荤素搭配', '水果', '汤品'],
        leadTime: 24
      },
      {
        id: 'refreshments',
        name: '茶歇服务',
        description: '会议间歇提供精美茶点',
        icon: 'pi pi-gift',
        category: 'catering',
        available: true,
        popular: true,
        requiresQuantity: true,
        quantityLabel: '人数',
        unit: '人',
        minQuantity: 10,
        maxQuantity: 100,
        baseCost: 25,
        costType: 'per-person',
        features: ['精美小食', '饮品', '水果'],
        leadTime: 4
      }
    ]
  },
  {
    id: 'technical',
    name: '技术支持',
    icon: 'pi pi-cog',
    services: [
      {
        id: 'it-support',
        name: 'IT技术支持',
        description: '专业IT人员现场技术支持',
        icon: 'pi pi-desktop',
        category: 'technical',
        available: true,
        requiresQuantity: true,
        quantityLabel: '人数',
        unit: '人',
        minQuantity: 1,
        maxQuantity: 3,
        baseCost: 80,
        costType: 'per-hour',
        features: ['设备调试', '网络配置', '问题解决'],
        leadTime: 8
      },
      {
        id: 'recording',
        name: '会议录制',
        description: '专业音视频录制服务',
        icon: 'pi pi-video',
        category: 'technical',
        available: true,
        baseCost: 200,
        costType: 'flat-rate',
        features: ['高清录制', '后期剪辑', '云端存储'],
        requiresApproval: true,
        leadTime: 12
      },
      {
        id: 'livestream',
        name: '直播服务',
        description: '专业团队进行会议直播',
        icon: 'pi pi-globe',
        category: 'technical',
        available: true,
        baseCost: 500,
        costType: 'flat-rate',
        features: ['多机位拍摄', '实时互动', '录制回放'],
        requiresApproval: true,
        leadTime: 24
      }
    ]
  },
  {
    id: 'logistics',
    name: '后勤服务',
    icon: 'pi pi-truck',
    services: [
      {
        id: 'transportation',
        name: '接送服务',
        description: '为参会人员提供专车接送',
        icon: 'pi pi-car',
        category: 'logistics',
        available: true,
        requiresQuantity: true,
        quantityLabel: '车辆数',
        unit: '辆',
        minQuantity: 1,
        maxQuantity: 5,
        baseCost: 150,
        costType: 'per-day',
        features: ['专车司机', '路线规划', '准时接送'],
        requiresNotes: true,
        notesPlaceholder: '请说明接送地点和时间安排',
        leadTime: 6
      },
      {
        id: 'accommodation',
        name: '住宿安排',
        description: '为外地参会人员安排住宿',
        icon: 'pi pi-building',
        category: 'logistics',
        available: true,
        requiresQuantity: true,
        quantityLabel: '房间数',
        unit: '间',
        minQuantity: 1,
        maxQuantity: 20,
        baseCost: 280,
        costType: 'per-person',
        timeOptions: [
          { label: '标准间', value: 'standard' },
          { label: '大床房', value: 'deluxe' },
          { label: '套房', value: 'suite' }
        ],
        features: ['合作酒店', '协议价格', '提前预订'],
        leadTime: 48
      }
    ]
  },
  {
    id: 'other',
    name: '其他服务',
    icon: 'pi pi-ellipsis-h',
    services: [
      {
        id: 'translation',
        name: '翻译服务',
        description: '专业中英文翻译服务',
        icon: 'pi pi-language',
        category: 'other',
        available: true,
        requiresQuantity: true,
        quantityLabel: '翻译人数',
        unit: '人',
        minQuantity: 1,
        maxQuantity: 3,
        baseCost: 120,
        costType: 'per-hour',
        features: ['同声传译', '交替传译'],
        leadTime: 24
      },
      {
        id: 'photography',
        name: '摄影服务',
        description: '专业摄影师现场拍照',
        icon: 'pi pi-camera',
        category: 'other',
        available: true,
        baseCost: 300,
        costType: 'flat-rate',
        features: ['专业设备', '后期处理', '精修照片'],
        leadTime: 8
      }
    ]
  }
])

// 计算属性
const totalCost = computed(() => {
  return selectedServices.value.reduce((total, item) => {
    const serviceCost = item.service.baseCost * item.quantity + (item.config?.additionalCost || 0)
    return total + serviceCost - (item.discount || 0)
  }, 0)
})

const totalDiscount = computed(() => {
  return selectedServices.value.reduce((total, item) => {
    return total + (item.discount || 0)
  }, 0)
})

const serviceReminders = computed<ServiceReminder[]>(() => {
  const reminders: ServiceReminder[] = []

  // 检查需要提前申请的服务
  selectedServices.value.forEach(item => {
    if (item.service.leadTime && item.service.leadTime > 0) {
      reminders.push({
        id: `lead-time-${item.service.id}`,
        icon: 'pi pi-clock',
        message: `${item.service.name}需要提前${item.service.leadTime}小时申请`
      })
    }

    if (item.service.requiresApproval) {
      reminders.push({
        id: `approval-${item.service.id}`,
        icon: 'pi pi-exclamation-triangle',
        message: `${item.service.name}需要部门审批，请提前提交申请`
      })
    }
  })

  // 检查人数相关的服务
  const cateringServices = selectedServices.value.filter(item => item.service.category === 'catering')
  if (cateringServices.length > 0) {
    const totalCateringQuantity = cateringServices.reduce((sum, item) => sum + item.quantity, 0)
    if (totalCateringQuantity < props.attendeeCount) {
      reminders.push({
        id: 'catering-quantity',
        icon: 'pi pi-users',
        message: `当前餐饮服务数量(${totalCateringQuantity})少于参会人数(${props.attendeeCount})`
      })
    }
  }

  return reminders
})

// 方法
const isServiceSelected = (serviceId: string) => {
  return selectedServices.value.some(item => item.service.id === serviceId)
}

const getCategorySelectedCount = (categoryId: string) => {
  return selectedServices.value.filter(item => item.service.category === categoryId).length
}

const calculateServiceCost = (service: Service) => {
  const quantity = serviceQuantities[service.id] || 1
  const timeOption = serviceTimeOptions[service.id]

  let cost = service.baseCost * quantity

  // 添加时间选项的额外费用
  if (timeOption && service.timeOptions) {
    const timeOptionConfig = service.timeOptions.find(option => option.value === timeOption)
    if (timeOptionConfig?.cost) {
      cost += timeOptionConfig.cost * quantity
    }
  }

  // 批量优惠
  if (quantity >= 20 && service.category === 'catering') {
    cost *= 0.95 // 5% 折扣
  }

  return cost
}

const getCostDescription = (service: Service) => {
  const quantity = serviceQuantities[service.id] || 1
  let description = ''

  switch (service.costType) {
    case 'per-person':
      description = `${service.baseCost}元/人 × ${quantity}人`
      break
    case 'per-hour':
      description = `${service.baseCost}元/小时`
      break
    case 'per-day':
      description = `${service.baseCost}元/天`
      break
    case 'flat-rate':
      description = '固定费用'
      break
  }

  const timeOption = serviceTimeOptions[service.id]
  if (timeOption && service.timeOptions) {
    const timeOptionConfig = service.timeOptions.find(option => option.value === timeOption)
    if (timeOptionConfig?.cost) {
      description += ` + ${timeOptionConfig.cost}元(${timeOptionConfig.label})`
    }
  }

  return description
}

const getGradientStyle = (category: string) => {
  const gradients = {
    catering: 'from-orange-400 to-pink-400',
    technical: 'from-blue-400 to-indigo-400',
    logistics: 'from-green-400 to-teal-400',
    other: 'from-purple-400 to-pink-400'
  }
  return {
    background: gradients[category as keyof typeof gradients] || gradients.other
  }
}

const getCategoryColor = (category: string) => {
  const colors = {
    catering: '#f97316',
    technical: '#3b82f6',
    logistics: '#10b981',
    other: '#8b5cf6'
  }
  return colors[category as keyof typeof colors] || colors.other
}

const getTimeOptionText = (timeOptionValue: string, timeOptions?: { label: string; value: string }[]) => {
  const option = timeOptions?.find(opt => opt.value === timeOptionValue)
  return option ? option.label : timeOptionValue
}

const toggleService = (service: Service) => {
  if (!service.available) return

  const existingIndex = selectedServices.value.findIndex(item => item.service.id === service.id)

  if (existingIndex >= 0) {
    // 移除服务
    selectedServices.value.splice(existingIndex, 1)
    delete serviceQuantities[service.id]
    delete serviceTimeOptions[service.id]
    delete serviceNotes[service.id]
  } else {
    // 添加服务
    const quantity = service.requiresQuantity
      ? (serviceQuantities[service.id] || (service.minQuantity || 1))
      : 1

    const selection: ServiceSelection = {
      service,
      quantity,
      config: {},
      selectedAt: new Date()
    }

    // 设置默认配置
    if (service.timeOptions && service.timeOptions.length > 0) {
      serviceTimeOptions[service.id] = service.timeOptions[0].value
      selection.config.timeOption = service.timeOptions[0].value
      selection.config.additionalCost = service.timeOptions[0].cost || 0
    }

    selectedServices.value.push(selection)
  }

  emitSelectionChange()
}

const removeService = (serviceId: string) => {
  const index = selectedServices.value.findIndex(item => item.service.id === serviceId)
  if (index >= 0) {
    selectedServices.value.splice(index, 1)
    delete serviceQuantities[serviceId]
    delete serviceTimeOptions[serviceId]
    delete serviceNotes[serviceId]
    emitSelectionChange()
  }
}

const clearSelection = () => {
  selectedServices.value = []
  Object.keys(serviceQuantities).forEach(key => delete serviceQuantities[key])
  Object.keys(serviceTimeOptions).forEach(key => delete serviceTimeOptions[key])
  Object.keys(serviceNotes).forEach(key => delete serviceNotes[key])
  emitSelectionChange()
}

const emitSelectionChange = () => {
  // 更新选中服务的配置
  selectedServices.value.forEach(item => {
    item.quantity = serviceQuantities[item.service.id] || 1
    item.config.timeOption = serviceTimeOptions[item.service.id]
    item.config.notes = serviceNotes[item.service.id]

    // 重新计算费用和折扣
    if (item.service.category === 'catering' && item.quantity >= 20) {
      item.discount = (item.service.baseCost * item.quantity) * 0.05 // 5% 折扣
    }
  })

  emit('selectionChange', [...selectedServices.value])
  emit('costChange', totalCost.value, totalDiscount.value)
}

// 初始化
onMounted(() => {
  // 设置初始选择
  if (props.initialSelection.length > 0) {
    selectedServices.value = [...props.initialSelection]

    // 恢复配置
    selectedServices.value.forEach(item => {
      if (item.quantity > 1) {
        serviceQuantities[item.service.id] = item.quantity
      }
      if (item.config.timeOption) {
        serviceTimeOptions[item.service.id] = item.config.timeOption
      }
      if (item.config.notes) {
        serviceNotes[item.service.id] = item.config.notes
      }
    })
  }

  // 根据参会人数预设餐饮服务数量
  if (props.attendeeCount > 0) {
    serviceCategories.value.forEach(category => {
      category.services.forEach(service => {
        if (service.requiresQuantity && service.category === 'catering') {
          serviceQuantities[service.id] = props.attendeeCount
        }
      })
    })
  }

  emitSelectionChange()
})

// 监听参会人数变化
watch(
  () => props.attendeeCount,
  (newCount) => {
    if (newCount > 0) {
      // 自动更新餐饮服务的数量
      selectedServices.value.forEach(item => {
        if (item.service.category === 'catering' && item.service.requiresQuantity) {
          item.quantity = newCount
          serviceQuantities[item.service.id] = newCount
        }
      })
      emitSelectionChange()
    }
  }
)
</script>

<style scoped>
.services-selector {
  max-width: 100%;
}

.category-header {
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.service-item {
  transition: all 0.2s ease;
}

.service-item.selected .service-card {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.service-item.disabled .service-card {
  opacity: 0.6;
  cursor: not-allowed;
}

.service-card {
  position: relative;
  overflow: hidden;
}

.service-header {
  color: white;
}

.popular-badge {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.feature-tag {
  font-size: 0.7rem;
  font-weight: 500;
}

.selection-summary {
  margin-top: 2rem;
  border-top: 2px solid #e5e7eb;
  padding-top: 1.5rem;
}

.reminders-section {
  margin-top: 1rem;
}

.config-details {
  color: #6b7280;
  font-size: 0.875rem;
}

.config-details i {
  width: 1rem;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .services-grid {
    grid-template-columns: 1fr !important;
  }

  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .category-header span {
    align-self: flex-end;
  }
}
</style>