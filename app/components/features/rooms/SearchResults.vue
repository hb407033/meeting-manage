<template>
  <div class="search-results">
    <!-- 搜索结果统计 -->
    <div class="results-header">
      <div class="results-info">
        <h3 class="results-title">
          {{ $t('rooms.searchResults', '搜索结果') }}
          <Badge
            v-if="total > 0"
            :value="total"
            severity="info"
            class="results-count"
          />
        </h3>
        <p class="results-summary">
          <span v-if="searchQuery">
            {{ $t('rooms.searchKeyword', '关键词') }}: <strong>"{{ searchQuery }}"</strong>
          </span>
          <span v-if="hasActiveFilters">
            | {{ $t('rooms.filteredResults', '筛选后') }}
          </span>
          <span v-if="loading">
            | {{ $t('common.loading', '加载中...') }}
          </span>
        </p>
      </div>

      <div class="results-actions">
        <div class="results-view-toggle">
          <SelectButton
            v-model="viewMode"
            :options="viewModeOptions"
            optionLabel="label"
            optionValue="value"
            class="view-toggle"
          />
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && rooms.length === 0" class="loading-state">
      <ProgressBar mode="indeterminate" class="loading-progress" />
      <div class="loading-text">{{ $t('rooms.searching', '正在搜索会议室...') }}</div>
    </div>

    <!-- 空结果状态 -->
    <div v-else-if="!loading && rooms.length === 0" class="empty-state">
      <div class="empty-icon">
        <i class="pi pi-search"></i>
      </div>
      <h4 class="empty-title">{{ $t('rooms.noResults', '未找到匹配的会议室') }}</h4>
      <p class="empty-message">
        <span v-if="searchQuery || hasActiveFilters">
          {{ $t('rooms.tryDifferentFilters', '尝试调整搜索条件或筛选器') }}
        </span>
        <span v-else>
          {{ $t('rooms.enterSearchKeyword', '请输入搜索关键词开始查找') }}
        </span>
      </p>
      <Button
        :label="$t('common.clearFilters', '清除筛选')"
        icon="pi pi-refresh"
        severity="secondary"
        @click="$emit('clear-filters')"
        v-if="searchQuery || hasActiveFilters"
      />
    </div>

    <!-- 搜索结果列表 - 网格视图 -->
    <div v-else-if="viewMode === 'grid' && !loading" class="results-grid">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-card"
        @click="$emit('room-select', room)"
      >
        <div class="room-card-header">
          <div class="room-name">{{ room.name }}</div>
          <Tag
            :value="getStatusText(room.status)"
            :severity="getStatusSeverity(room.status)"
            class="room-status"
          />
        </div>

        <div class="room-card-body">
          <div class="room-info">
            <div class="info-item" v-if="room.location">
              <i class="pi pi-map-marker"></i>
              <span>{{ room.location }}</span>
            </div>
            <div class="info-item">
              <i class="pi pi-users"></i>
              <span>{{ $t('rooms.capacity', '容量') }}: {{ room.capacity }}{{ $t('common.people', '人') }}</span>
            </div>
          </div>

          <div class="room-description" v-if="room.description">
            {{ truncateText(room.description, 80) }}
          </div>

          <div class="room-equipment" v-if="hasEquipment(room)">
            <div class="equipment-list">
              <i
                v-for="(equipment, key) in getEquipmentList(room)"
                :key="key"
                :class="equipment.icon"
                :title="equipment.label"
                class="equipment-icon"
                v-tooltip="equipment.label"
              />
            </div>
          </div>

          <div class="room-reservations" v-if="room._count?.reservations > 0">
            <small class="reservations-info">
              <i class="pi pi-calendar"></i>
              {{ room._count.reservations }} {{ $t('rooms.upcomingReservations', '个即将开始的预约') }}
            </small>
          </div>
        </div>

        <div class="room-card-footer">
          <Button
            :label="$t('common.viewDetails', '查看详情')"
            icon="pi pi-eye"
            size="small"
            text
            @click.stop="$emit('room-details', room)"
          />
        </div>
      </div>
    </div>

    <!-- 搜索结果列表 - 表格视图 -->
    <div v-else-if="viewMode === 'table' && !loading" class="results-table">
      <DataTable
        :value="rooms"
        :paginator="total > limit"
        :rows="limit"
        :totalRecords="total"
        :lazy="true"
        @page="$emit('page-change', $event)"
        class="room-table"
        dataKey="id"
      >
        <Column
          field="name"
          :header="$t('rooms.name', '名称')"
          sortable
          class="name-column"
        >
          <template #body="{ data }">
            <div class="room-name-cell">
              <div class="room-name">{{ data.name }}</div>
              <Tag
                :value="getStatusText(data.status)"
                :severity="getStatusSeverity(data.status)"
                class="room-status-sm"
              />
            </div>
          </template>
        </Column>

        <Column
          field="location"
          :header="$t('rooms.location', '位置')"
          sortable
          class="location-column"
        >
          <template #body="{ data }">
            <span v-if="data.location">{{ data.location }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </Column>

        <Column
          field="capacity"
          :header="$t('rooms.capacity', '容量')"
          sortable
          class="capacity-column"
        >
          <template #body="{ data }">
            {{ data.capacity }} {{ $t('common.people', '人') }}
          </template>
        </Column>

        <Column
          :header="$t('rooms.equipment', '设备')"
          class="equipment-column"
        >
          <template #body="{ data }">
            <div class="equipment-list-sm" v-if="hasEquipment(data)">
              <i
                v-for="(equipment, key) in getEquipmentList(data)"
                :key="key"
                :class="equipment.icon"
                :title="equipment.label"
                class="equipment-icon-sm"
                v-tooltip="equipment.label"
              />
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </Column>

        <Column
          :header="$t('rooms.actions', '操作')"
          class="actions-column"
        >
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-eye"
                size="small"
                text
                @click="$emit('room-details', data)"
                v-tooltip="$t('common.viewDetails', '查看详情')"
              />
              <Button
                icon="pi pi-calendar-plus"
                size="small"
                text
                @click="$emit('room-book', data)"
                v-tooltip="$t('rooms.bookRoom', '预约会议室')"
                :disabled="data.status !== 'AVAILABLE'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- 分页组件 -->
    <div v-if="total > limit && !loading" class="pagination-container">
      <Paginator
        :rows="limit"
        :totalRecords="total"
        :first="(currentPage - 1) * limit"
        @page="handlePageChange"
        class="search-pagination"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface MeetingRoom {
  id: string
  name: string
  description?: string
  capacity: number
  location?: string
  equipment?: any
  status: string
  _count?: {
    reservations: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Props {
  rooms: MeetingRoom[]
  loading?: boolean
  searchQuery?: string
  pagination?: PaginationInfo
  hasActiveFilters?: boolean
  initialViewMode?: string
}

interface Emits {
  (e: 'room-select', room: MeetingRoom): void
  (e: 'room-details', room: MeetingRoom): void
  (e: 'room-book', room: MeetingRoom): void
  (e: 'page-change', event: any): void
  (e: 'clear-filters'): void
  (e: 'view-mode-change', mode: string): void
}

const props = withDefaults(defineProps<Props>(), {
  rooms: () => [],
  loading: false,
  searchQuery: '',
  hasActiveFilters: false,
  initialViewMode: 'grid'
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

// 响应式数据
const viewMode = ref(props.initialViewMode)

// 选项数据
const viewModeOptions = [
  { value: 'grid', label: t('common.gridView', '网格视图') },
  { value: 'table', label: t('common.tableView', '表格视图') }
]

// 计算属性
const total = computed(() => props.pagination?.total || 0)
const limit = computed(() => props.pagination?.limit || 20)
const currentPage = computed(() => props.pagination?.page || 1)

// 设备选项映射
const equipmentMap = {
  projector: { icon: 'pi pi-desktop', label: t('equipment.projector', '投影仪') },
  whiteboard: { icon: 'pi pi-file', label: t('equipment.whiteboard', '白板') },
  videoConf: { icon: 'pi pi-video', label: t('equipment.videoConf', '视频会议') },
  airCondition: { icon: 'pi pi-spin', label: t('equipment.airCondition', '空调') },
  wifi: { icon: 'pi pi-wifi', label: t('equipment.wifi', 'WiFi') }
}

// 方法
const getStatusText = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return t('rooms.statusAvailable', '可用')
    case 'OCCUPIED': return t('rooms.statusOccupied', '使用中')
    case 'MAINTENANCE': return t('rooms.statusMaintenance', '维护中')
    case 'RESERVED': return t('rooms.statusReserved', '已预约')
    case 'DISABLED': return t('rooms.statusDisabled', '停用')
    default: return status
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'success'
    case 'OCCUPIED': return 'warning'
    case 'MAINTENANCE': return 'danger'
    case 'RESERVED': return 'info'
    case 'DISABLED': return 'secondary'
    default: return 'info'
  }
}

const hasEquipment = (room: MeetingRoom) => {
  return room.equipment && typeof room.equipment === 'object' && Object.keys(room.equipment).length > 0
}

const getEquipmentList = (room: MeetingRoom) => {
  if (!hasEquipment(room)) return []

  return Object.entries(room.equipment)
    .filter(([key, value]) => value === true && equipmentMap[key as keyof typeof equipmentMap])
    .map(([key]) => equipmentMap[key as keyof typeof equipmentMap])
}

const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
}

const handlePageChange = (event: any) => {
  emit('page-change', event)
}

// 监听视图模式变化
watch(viewMode, (newMode) => {
  emit('view-mode-change', newMode)
})
</script>

<style scoped>
.search-results {
  width: 100%;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.results-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.results-count {
  font-size: 0.875rem;
}

.results-summary {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.results-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.loading-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-progress {
  margin-bottom: 1rem;
}

.loading-text {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-title {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.125rem;
  font-weight: 500;
}

.empty-message {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.room-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  height: fit-content;
}

.room-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.room-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.room-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.room-status {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.room-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.info-item i {
  font-size: 0.875rem;
}

.room-description {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.room-equipment {
  display: flex;
  align-items: center;
}

.equipment-list {
  display: flex;
  gap: 0.5rem;
}

.equipment-icon {
  color: var(--primary-color);
  font-size: 1rem;
}

.room-reservations {
  margin-top: 0.5rem;
}

.reservations-info {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.room-card-footer {
  padding-top: 1rem;
  border-top: 1px solid var(--surface-100);
  display: flex;
  justify-content: flex-end;
}

.results-table {
  margin-bottom: 2rem;
}

.room-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.room-status-sm {
  font-size: 0.7rem;
  align-self: flex-start;
}

.equipment-list-sm {
  display: flex;
  gap: 0.25rem;
}

.equipment-icon-sm {
  color: var(--primary-color);
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.text-muted {
  color: var(--text-color-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .results-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .room-card {
    padding: 1rem;
  }

  .results-table {
    overflow-x: auto;
  }
}

@media (max-width: 480px) {
  .results-title {
    font-size: 1.125rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>