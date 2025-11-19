<template>
  <div class="attendee-manager">
    <!-- 组件标题和统计 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800">
        <i class="pi pi-users mr-2 text-blue-600"></i>
        参会人员管理
      </h3>
      <div class="flex items-center gap-4">
        <div class="capacity-indicator">
          <span class="text-sm text-gray-600">
            已添加: {{ internalAttendees.length + externalAttendees.length }}/{{ roomCapacity }}人
          </span>
          <ProgressBar
            :value="capacityPercentage"
            :class="{ 'bg-red-100': capacityPercentage > 100, 'bg-yellow-100': capacityPercentage >= 90 && capacityPercentage <= 100 }"
            class="w-32 h-2 ml-2"
          />
        </div>
        <Button
          icon="pi pi-plus"
          label="添加人员"
          class="p-button-outlined p-button-sm"
          @click="showAddDialog = true"
        />
      </div>
    </div>

    <!-- 容量警告 -->
    <div v-if="isOverCapacity" class="capacity-warning mb-4">
      <Message severity="error" :closable="false">
        <div class="flex items-center">
          <i class="pi pi-exclamation-triangle mr-2"></i>
          <span>参会人数已超过会议室容量 ({{ totalAttendees }}/{{ roomCapacity }}人)，请减少人数或更换更大的会议室</span>
        </div>
      </Message>
    </div>

    <div v-else-if="isNearCapacity" class="capacity-warning mb-4">
      <Message severity="warn" :closable="false">
        <div class="flex items-center">
          <i class="pi pi-info-circle mr-2"></i>
          <span>参会人数接近会议室容量上限 ({{ totalAttendees }}/{{ roomCapacity }}人)</span>
        </div>
      </Message>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section mb-4">
      <div class="flex gap-2">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <InputText
            v-model="searchQuery"
            placeholder="搜索参会人员..."
            class="w-full"
          />
        </span>
        <Dropdown
          v-model="filterType"
          :options="filterOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="筛选类型"
          class="w-40"
        />
      </div>
    </div>

    <!-- 参会人员列表 -->
    <div class="attendee-list">
      <!-- 内部员工部分 -->
      <div v-if="filteredInternalAttendees.length > 0" class="attendee-section mb-6">
        <div class="section-header flex items-center mb-3">
          <i class="pi pi-building mr-2 text-green-600"></i>
          <h4 class="font-medium text-gray-800">内部员工 ({{ filteredInternalAttendees.length }}人)</h4>
          <div class="ml-auto flex gap-2">
            <Button
              icon="pi pi-user-plus"
              label="批量添加员工"
              class="p-button-text p-button-sm"
              @click="showEmployeeSearch = true"
            />
            <Button
              icon="pi pi-download"
              label="从通讯录导入"
              class="p-button-text p-button-sm"
              @click="importFromContacts"
            />
          </div>
        </div>

        <div class="attendee-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="attendee in filteredInternalAttendees"
            :key="attendee.id"
            class="attendee-card"
            :class="{ 'organizer': attendee.isOrganizer }"
          >
            <Card class="h-full">
              <template #header>
                <div class="card-header p-3 bg-green-50 border-b border-green-100">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <div class="avatar w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {{ getInitials(attendee.name) }}
                      </div>
                      <div class="ml-3">
                        <h5 class="font-medium text-gray-800">{{ attendee.name }}</h5>
                        <p class="text-xs text-gray-600">{{ attendee.department }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        v-if="attendee.isOrganizer"
                        class="organizer-badge bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        组织者
                      </span>
                      <Button
                        icon="pi pi-times"
                        size="small"
                        class="p-button-text p-button-rounded"
                        @click="removeAttendee(attendee)"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <template #content>
                <div class="attendee-details text-sm">
                  <div class="detail-item flex items-center mb-2">
                    <i class="pi pi-envelope mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.email }}</span>
                  </div>
                  <div class="detail-item flex items-center mb-2">
                    <i class="pi pi-phone mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.phone || '未设置' }}</span>
                  </div>
                  <div class="detail-item flex items-center mb-2">
                    <i class="pi pi-briefcase mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.position }}</span>
                  </div>
                  <div v-if="attendee.specialRequirements" class="special-requirements mt-3">
                    <div class="text-xs text-gray-500 mb-1">特殊需求:</div>
                    <div class="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      {{ attendee.specialRequirements }}
                    </div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>

      <!-- 外部访客部分 -->
      <div v-if="filteredExternalAttendees.length > 0" class="attendee-section">
        <div class="section-header flex items-center mb-3">
          <i class="pi pi-user-plus mr-2 text-blue-600"></i>
          <h4 class="font-medium text-gray-800">外部访客 ({{ filteredExternalAttendees.length }}人)</h4>
          <Button
            icon="pi pi-user-plus"
            label="添加访客"
            class="p-button-text p-button-sm ml-auto"
            @click="showGuestForm = true"
          />
        </div>

        <div class="attendee-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="attendee in filteredExternalAttendees"
            :key="attendee.id"
            class="attendee-card"
          >
            <Card class="h-full">
              <template #header>
                <div class="card-header p-3 bg-blue-50 border-b border-blue-100">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <div class="avatar w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {{ getInitials(attendee.name) }}
                      </div>
                      <div class="ml-3">
                        <h5 class="font-medium text-gray-800">{{ attendee.name }}</h5>
                        <p class="text-xs text-gray-600">{{ attendee.company || '个人' }}</p>
                      </div>
                    </div>
                    <Button
                      icon="pi pi-times"
                      size="small"
                      class="p-button-text p-button-rounded"
                      @click="removeAttendee(attendee)"
                    />
                  </div>
                </div>
              </template>

              <template #content>
                <div class="attendee-details text-sm">
                  <div class="detail-item flex items-center mb-2">
                    <i class="pi pi-envelope mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.email }}</span>
                  </div>
                  <div class="detail-item flex items-center mb-2">
                    <i class="pi pi-phone mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.phone }}</span>
                  </div>
                  <div v-if="attendee.visitPurpose" class="detail-item flex items-center mb-2">
                    <i class="pi pi-info-circle mr-2 text-gray-500"></i>
                    <span class="text-gray-700">{{ attendee.visitPurpose }}</span>
                  </div>
                  <div v-if="attendee.specialRequirements" class="special-requirements mt-3">
                    <div class="text-xs text-gray-500 mb-1">特殊需求:</div>
                    <div class="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      {{ attendee.specialRequirements }}
                    </div>
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredAttendees.length === 0" class="empty-state">
        <div class="text-center py-8">
          <i class="pi pi-users text-4xl text-gray-400 mb-3"></i>
          <p class="text-gray-500 mb-4">暂无参会人员</p>
          <div class="flex justify-center gap-2">
            <Button
              icon="pi pi-user-plus"
              label="添加内部员工"
              class="p-button-outlined"
              @click="showEmployeeSearch = true"
            />
            <Button
              icon="pi pi-user-plus"
              label="添加外部访客"
              class="p-button-outlined"
              @click="showGuestForm = true"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 添加人员对话框 -->
    <Dialog
      v-model:visible="showAddDialog"
      header="添加参会人员"
      :style="{ width: '450px' }"
      modal
    >
      <div class="add-options grid grid-cols-2 gap-4">
        <div
          class="add-option p-4 border rounded-lg cursor-pointer hover:bg-gray-50 text-center"
          @click="showEmployeeSearch = true; showAddDialog = false;"
        >
          <i class="pi pi-building text-2xl text-green-600 mb-2"></i>
          <h4 class="font-medium">内部员工</h4>
          <p class="text-sm text-gray-600 mt-1">从公司员工中搜索添加</p>
        </div>
        <div
          class="add-option p-4 border rounded-lg cursor-pointer hover:bg-gray-50 text-center"
          @click="showGuestForm = true; showAddDialog = false;"
        >
          <i class="pi pi-user-plus text-2xl text-blue-600 mb-2"></i>
          <h4 class="font-medium">外部访客</h4>
          <p class="text-sm text-gray-600 mt-1">手动输入访客信息</p>
        </div>
      </div>
    </Dialog>

    <!-- 员工搜索对话框 -->
    <Dialog
      v-model:visible="showEmployeeSearch"
      header="搜索内部员工"
      :style="{ width: '600px' }"
      modal
    >
      <EmployeeSearch
        :excluded-ids="getExcludedEmployeeIds()"
        @select="addEmployees"
        @cancel="showEmployeeSearch = false"
      />
    </Dialog>

    <!-- 访客表单对话框 -->
    <Dialog
      v-model:visible="showGuestForm"
      header="添加外部访客"
      :style="{ width: '500px' }"
      modal
    >
      <GuestForm
        @submit="addGuest"
        @cancel="showGuestForm = false"
      />
    </Dialog>

    <!-- 通讯录导入对话框 -->
    <Dialog
      v-model:visible="showContactImport"
      header="从通讯录导入"
      :style="{ width: '500px' }"
      modal
    >
      <ContactImport
        :excluded-ids="getExcludedEmployeeIds()"
        @import="addEmployees"
        @cancel="showContactImport = false"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

// 子组件导入
import EmployeeSearch from './EmployeeSearch.vue'
import GuestForm from './GuestForm.vue'
import ContactImport from './ContactImport.vue'

// Props
interface Props {
  roomCapacity?: number
  maxAttendees?: number
  initialAttendees?: Attendee[]
}

const props = withDefaults(defineProps<Props>(), {
  roomCapacity: 10,
  maxAttendees: 100,
  initialAttendees: () => []
})

// Emits
const emit = defineEmits<{
  attendeesChange: [attendees: Attendee[]]
  capacityWarning: [isOverCapacity: boolean, currentCount: number, capacity: number]
}>()

// 响应式数据
const searchQuery = ref('')
const filterType = ref('all')
const showAddDialog = ref(false)
const showEmployeeSearch = ref(false)
const showGuestForm = ref(false)
const showContactImport = ref(false)

// 参会人员数据
const internalAttendees = ref<InternalAttendee[]>([])
const externalAttendees = ref<ExternalAttendee[]>([])

// 数据类型定义
interface Attendee {
  id: string
  name: string
  email: string
  phone?: string
  specialRequirements?: string
  addedAt: Date
}

interface InternalAttendee extends Attendee {
  type: 'internal'
  employeeId: string
  department: string
  position: string
  isOrganizer: boolean
}

interface ExternalAttendee extends Attendee {
  type: 'external'
  company?: string
  visitPurpose?: string
}

// 过滤选项
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '内部员工', value: 'internal' },
  { label: '外部访客', value: 'external' },
  { label: '组织者', value: 'organizer' }
]

// 计算属性
const totalAttendees = computed(() => internalAttendees.value.length + externalAttendees.value.length)

const capacityPercentage = computed(() => {
  return Math.min((totalAttendees.value / props.roomCapacity) * 100, 120) // 最大显示120%
})

const isOverCapacity = computed(() => totalAttendees.value > props.roomCapacity)

const isNearCapacity = computed(() => {
  return totalAttendees.value >= props.roomCapacity * 0.9 && totalAttendees.value <= props.roomCapacity
})

const filteredAttendees = computed(() => {
  let attendees = [...internalAttendees.value, ...externalAttendees.value]

  // 应用搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    attendees = attendees.filter(attendee =>
      attendee.name.toLowerCase().includes(query) ||
      attendee.email.toLowerCase().includes(query) ||
      (attendee.phone && attendee.phone.includes(query))
    )
  }

  // 应用类型过滤
  switch (filterType.value) {
    case 'internal':
      attendees = attendees.filter(a => a.type === 'internal')
      break
    case 'external':
      attendees = attendees.filter(a => a.type === 'external')
      break
    case 'organizer':
      attendees = attendees.filter(a => a.type === 'internal' && a.isOrganizer)
      break
  }

  return attendees
})

const filteredInternalAttendees = computed(() => {
  return filteredAttendees.value
    .filter(attendee => attendee.type === 'internal') as InternalAttendee[]
})

const filteredExternalAttendees = computed(() => {
  return filteredAttendees.value
    .filter(attendee => attendee.type === 'external') as ExternalAttendee[]
})

// 方法
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getExcludedEmployeeIds = () => {
  return internalAttendees.value.map(emp => emp.employeeId)
}

const addEmployees = (employees: any[]) => {
  employees.forEach(emp => {
    const internalAttendee: InternalAttendee = {
      id: `internal-${emp.id}-${Date.now()}`,
      type: 'internal',
      employeeId: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      isOrganizer: false,
      addedAt: new Date()
    }
    internalAttendees.value.push(internalAttendee)
  })

  showEmployeeSearch = false
  showContactImport = false
  emitAttendeesChange()
}

const addGuest = (guestData: any) => {
  const externalAttendee: ExternalAttendee = {
    id: `external-${Date.now()}-${Math.random()}`,
    type: 'external',
    name: guestData.name,
    email: guestData.email,
    phone: guestData.phone,
    company: guestData.company,
    visitPurpose: guestData.visitPurpose,
    specialRequirements: guestData.specialRequirements,
    addedAt: new Date()
  }

  externalAttendees.value.push(externalAttendee)
  showGuestForm = false
  emitAttendeesChange()
}

const removeAttendee = (attendee: Attendee) => {
  if (attendee.type === 'internal') {
    const index = internalAttendees.value.findIndex(a => a.id === attendee.id)
    if (index >= 0) {
      internalAttendees.value.splice(index, 1)
    }
  } else {
    const index = externalAttendees.value.findIndex(a => a.id === attendee.id)
    if (index >= 0) {
      externalAttendees.value.splice(index, 1)
    }
  }

  emitAttendeesChange()
}

const importFromContacts = () => {
  showContactImport.value = true
}

const emitAttendeesChange = () => {
  const allAttendees = [...internalAttendees.value, ...externalAttendees.value]
  emit('attendeesChange', allAttendees)
  emit('capacityWarning', isOverCapacity.value, totalAttendees.value, props.roomCapacity)
}

// 监听容量变化
watch(
  () => totalAttendees.value,
  (newCount) => {
    emit('capacityWarning', isOverCapacity.value, newCount, props.roomCapacity)
  },
  { immediate: true }
)

// 初始化
onMounted(() => {
  // 设置初始参会人员
  if (props.initialAttendees.length > 0) {
    props.initialAttendees.forEach(attendee => {
      if (attendee.type === 'internal') {
        internalAttendees.value.push(attendee as InternalAttendee)
      } else {
        externalAttendees.value.push(attendee as ExternalAttendee)
      }
    })
  }

  emitAttendeesChange()
})
</script>

<style scoped>
.attendee-manager {
  max-width: 100%;
}

.capacity-indicator {
  display: flex;
  align-items: center;
}

.capacity-warning {
  animation: slideInDown 0.3s ease-out;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-section {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.attendee-section {
  background: #ffffff;
  border-radius: 0.5rem;
}

.section-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.attendee-card {
  transition: all 0.2s ease;
}

.attendee-card:hover {
  transform: translateY(-2px);
}

.attendee-card.organizer :deep(.p-card) {
  border-left: 4px solid #3b82f6;
}

.card-header {
  background: linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%);
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.organizer-badge {
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.special-requirements {
  border-top: 1px solid #f3f4f6;
  padding-top: 0.5rem;
}

.empty-state {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
}

.add-option {
  transition: all 0.2s ease;
}

.add-option:hover {
  background-color: #f3f4f6;
  border-color: #3b82f6;
  transform: translateY(-2px);
}

.add-option:hover .pi {
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .attendee-cards {
    grid-template-columns: 1fr !important;
  }

  .capacity-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .section-header .flex.gap-2 {
    width: 100%;
    justify-content: flex-start;
  }
}

/* 进度条颜色覆盖 */
:deep(.p-progressbar.bg-red-100 .p-progressbar-value) {
  background-color: #ef4444;
}

:deep(.p-progressbar.bg-yellow-100 .p-progressbar-value) {
  background-color: #f59e0b;
}
</style>