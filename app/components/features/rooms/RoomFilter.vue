<template>
  <div class="room-filter">
    <Panel
      :header="$t('rooms.filters', '筛选条件')"
      :toggleable="true"
      :collapsed="collapsed"
      @update:collapsed="handleToggleCollapse"
      class="filter-panel"
    >
      <div class="filter-content">
        <!-- 位置筛选 -->
        <div class="filter-section">
          <label class="filter-label">{{ $t('rooms.location', '位置') }}</label>
          <InputText
            v-model="filters.location"
            :placeholder="$t('rooms.locationPlaceholder', '输入位置关键词...')"
            class="w-full"
            @input="handleFilterChange"
          />
        </div>

        <!-- 容量范围筛选 -->
        <div class="filter-section">
          <label class="filter-label">{{ $t('rooms.capacity', '容量范围') }}</label>
          <div class="capacity-range">
            <div class="capacity-inputs">
              <InputNumber
                v-model="filters.capacityMin"
                :placeholder="$t('rooms.minCapacity', '最小')"
                :min="1"
                :max="1000"
                class="capacity-input"
                @input="handleFilterChange"
              />
              <span class="capacity-separator">-</span>
              <InputNumber
                v-model="filters.capacityMax"
                :placeholder="$t('rooms.maxCapacity', '最大')"
                :min="1"
                :max="1000"
                class="capacity-input"
                @input="handleFilterChange"
              />
            </div>
            <Slider
              v-model="capacityRange"
              :min="1"
              :max="100"
              :step="1"
              range
              class="capacity-slider"
              @slide-end="handleCapacitySlide"
            />
          </div>
        </div>

        <!-- 状态筛选 -->
        <div class="filter-section">
          <label class="filter-label">{{ $t('rooms.status', '状态') }}</label>
          <div class="status-filters">
            <div
              v-for="status in roomStatuses"
              :key="status.value"
              class="status-checkbox"
            >
              <Checkbox
                v-model="filters.status"
                :inputId="`status-${status.value}`"
                :value="status.value"
                @change="handleFilterChange"
              />
              <label :for="`status-${status.value}`" class="status-label">
                <Tag
                  :value="status.label"
                  :severity="getTagSeverity(status.value)"
                  class="status-tag"
                />
              </label>
            </div>
          </div>
        </div>

        <!-- 设备筛选 -->
        <div class="filter-section">
          <label class="filter-label">{{ $t('rooms.equipment', '设备配置') }}</label>
          <div class="equipment-filters">
            <div
              v-for="equipment in equipmentOptions"
              :key="equipment.key"
              class="equipment-checkbox"
            >
              <Checkbox
                v-model="filters.equipment[equipment.key]"
                :inputId="`equipment-${equipment.key}`"
                :binary="true"
                @change="handleFilterChange"
              />
              <label :for="`equipment-${equipment.key}`" class="equipment-label">
                <i :class="equipment.icon" class="equipment-icon"></i>
                <span>{{ equipment.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 排序选项 -->
        <div class="filter-section">
          <label class="filter-label">{{ $t('rooms.sortBy', '排序方式') }}</label>
          <div class="sort-options">
            <Dropdown
              v-model="filters.sortBy"
              :options="sortOptions"
              optionLabel="label"
              optionValue="value"
              class="sort-dropdown"
              @change="handleFilterChange"
            />
            <SelectButton
              v-model="filters.sortOrder"
              :options="sortOrderOptions"
              optionLabel="label"
              optionValue="value"
              class="sort-order"
              @change="handleFilterChange"
            />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="filter-actions">
          <Button
            :label="$t('common.apply', '应用筛选')"
            icon="pi pi-check"
            class="apply-button"
            @click="applyFilters"
          />
          <Button
            :label="$t('common.reset', '重置')"
            icon="pi pi-refresh"
            severity="secondary"
            class="reset-button"
            @click="resetFilters"
          />
        </div>
      </div>
    </Panel>

    <!-- 活跃筛选标签 -->
    <div v-if="activeFilters.length > 0" class="active-filters">
      <span class="active-label">{{ $t('rooms.activeFilters', '当前筛选:') }}</span>
      <div class="filter-tags">
        <Chip
          v-for="(filter, index) in activeFilters"
          :key="index"
          :label="filter.label"
          removable
          @remove="removeFilter(filter)"
          class="active-filter-tag"
        />
      </div>
      <Button
        :label="$t('common.clearAll', '清除全部')"
        icon="pi pi-times"
        severity="danger"
        text
        size="small"
        @click="clearAllFilters"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface RoomFilters {
  location?: string
  capacityMin?: number
  capacityMax?: number
  status?: string
  equipment: Record<string, boolean>
  sortBy: string
  sortOrder: string
}

interface Props {
  modelValue?: RoomFilters
  collapsed?: boolean
}

interface Emits {
  (e: 'update:modelValue', filters: RoomFilters): void
  (e: 'apply', filters: RoomFilters): void
  (e: 'reset'): void
  (e: 'update:collapsed', collapsed: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  modelValue: () => ({
    equipment: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

// 响应式数据
const filters = ref<RoomFilters>({ ...props.modelValue })
const collapsed = ref(props.collapsed)

// 选项数据
const roomStatuses = [
  { value: 'AVAILABLE', label: t('rooms.statusAvailable', '可用') },
  { value: 'OCCUPIED', label: t('rooms.statusOccupied', '使用中') },
  { value: 'MAINTENANCE', label: t('rooms.statusMaintenance', '维护中') },
  { value: 'RESERVED', label: t('rooms.statusReserved', '已预约') },
  { value: 'DISABLED', label: t('rooms.statusDisabled', '停用') }
]

const equipmentOptions = [
  { key: 'projector', label: t('equipment.projector', '投影仪'), icon: 'pi pi-desktop' },
  { key: 'whiteboard', label: t('equipment.whiteboard', '白板'), icon: 'pi pi-file' },
  { key: 'videoConf', label: t('equipment.videoConf', '视频会议'), icon: 'pi pi-video' },
  { key: 'airCondition', label: t('equipment.airCondition', '空调'), icon: 'pi pi-spin' },
  { key: 'wifi', label: t('equipment.wifi', 'WiFi'), icon: 'pi pi-wifi' }
]

const sortOptions = [
  { value: 'name', label: t('rooms.sortByName', '名称') },
  { value: 'capacity', label: t('rooms.sortByCapacity', '容量') },
  { value: 'location', label: t('rooms.sortByLocation', '位置') },
  { value: 'createdAt', label: t('rooms.sortByCreated', '创建时间') },
  { value: 'updatedAt', label: t('rooms.sortByUpdated', '更新时间') }
]

const sortOrderOptions = [
  { value: 'asc', label: t('common.ascending', '升序') },
  { value: 'desc', label: t('common.descending', '降序') }
]

// 计算属性
const capacityRange = computed({
  get: () => [filters.value.capacityMin || 1, filters.value.capacityMax || 100],
  set: ([min, max]) => {
    filters.value.capacityMin = min
    filters.value.capacityMax = max
  }
})

const activeFilters = computed(() => {
  const active = []

  if (filters.value.location) {
    active.push({ type: 'location', label: `${t('rooms.location', '位置')}: ${filters.value.location}` })
  }

  if (filters.value.capacityMin || filters.value.capacityMax) {
    const capacityLabel = `${t('rooms.capacity', '容量')}: ${filters.value.capacityMin || 1}-${filters.value.capacityMax || 100}`
    active.push({ type: 'capacity', label: capacityLabel })
  }

  if (filters.value.status) {
    const status = roomStatuses.find(s => s.value === filters.value.status)
    if (status) {
      active.push({ type: 'status', label: `${t('rooms.status', '状态')}: ${status.label}` })
    }
  }

  Object.entries(filters.value.equipment).forEach(([key, value]) => {
    if (value) {
      const equipment = equipmentOptions.find(e => e.key === key)
      if (equipment) {
        active.push({ type: 'equipment', key, label: `${equipment.label}` })
      }
    }
  })

  return active
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  filters.value = { ...newValue }
}, { deep: true })

watch(() => props.collapsed, (newValue) => {
  collapsed.value = newValue
})

// 方法
const handleToggleCollapse = (value: boolean) => {
  collapsed.value = value
  emit('update:collapsed', value)
}

const handleFilterChange = () => {
  emit('update:modelValue', { ...filters.value })
}

const handleCapacitySlide = ([min, max]: [number, number]) => {
  filters.value.capacityMin = min
  filters.value.capacityMax = max
  handleFilterChange()
}

const applyFilters = () => {
  emit('apply', { ...filters.value })
}

const resetFilters = () => {
  filters.value = {
    equipment: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
  emit('update:modelValue', { ...filters.value })
  emit('reset')
}

const removeFilter = (filter: any) => {
  switch (filter.type) {
    case 'location':
      filters.value.location = undefined
      break
    case 'capacity':
      filters.value.capacityMin = undefined
      filters.value.capacityMax = undefined
      break
    case 'status':
      filters.value.status = undefined
      break
    case 'equipment':
      filters.value.equipment[filter.key] = false
      break
  }
  handleFilterChange()
}

const clearAllFilters = () => {
  resetFilters()
}

const getTagSeverity = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'success'
    case 'OCCUPIED': return 'warning'
    case 'MAINTENANCE': return 'danger'
    case 'RESERVED': return 'info'
    case 'DISABLED': return 'secondary'
    default: return 'info'
  }
}
</script>

<style scoped>
.room-filter {
  width: 100%;
}

.filter-panel {
  margin-bottom: 1rem;
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.capacity-range {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.capacity-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.capacity-input {
  flex: 1;
}

.capacity-separator {
  color: var(--text-color-secondary);
  font-weight: 500;
}

.capacity-slider {
  margin-top: 0.5rem;
}

.status-filters,
.equipment-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.status-checkbox,
.equipment-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label,
.equipment-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin: 0;
}

.equipment-icon {
  font-size: 1rem;
  color: var(--primary-color);
}

.status-tag {
  font-size: 0.875rem;
}

.sort-options {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.sort-dropdown {
  flex: 1;
}

.sort-order {
  flex-shrink: 0;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.apply-button {
  flex: 1;
}

.reset-button {
  flex-shrink: 0;
}

.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--surface-100);
  border-radius: 6px;
  margin-top: 1rem;
}

.active-label {
  font-weight: 600;
  color: var(--text-color);
  margin-right: 0.5rem;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.active-filter-tag {
  background-color: var(--primary-color);
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-filters,
  .equipment-filters {
    grid-template-columns: 1fr;
  }

  .sort-options {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions {
    flex-direction: column;
  }

  .active-filters {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .filter-tags {
    width: 100%;
  }
}
</style>