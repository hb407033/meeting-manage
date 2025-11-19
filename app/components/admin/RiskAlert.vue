<template>
  <div class="risk-alert">
    <!-- 告警统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-red-100 rounded-lg">
            <i class="pi pi-exclamation-circle text-red-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">活跃告警</p>
            <p class="text-xl font-semibold text-gray-900">{{ alertStats.active.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-orange-100 rounded-lg">
            <i class="pi pi-exclamation-triangle text-orange-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">高风险</p>
            <p class="text-xl font-semibold text-gray-900">{{ alertStats.high.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-lg">
            <i class="pi pi-bolt text-purple-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">关键风险</p>
            <p class="text-xl font-semibold text-gray-900">{{ alertStats.critical.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <i class="pi pi-check text-green-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">已确认</p>
            <p class="text-xl font-semibold text-gray-900">{{ alertStats.acknowledged.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">告警类型</label>
            <Dropdown
              v-model="filters.type"
              :options="typeOptions"
              placeholder="选择类型"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">严重程度</label>
            <Dropdown
              v-model="filters.severity"
              :options="severityOptions"
              placeholder="选择严重程度"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">确认状态</label>
            <Dropdown
              v-model="filters.acknowledged"
              :options="statusOptions"
              placeholder="选择状态"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">解决状态</label>
            <Dropdown
              v-model="filters.resolved"
              :options="resolvedOptions"
              placeholder="选择状态"
              class="w-full"
              showClear
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <Button
            @click="resetFilters"
            label="重置"
            severity="secondary"
            icon="pi pi-refresh"
          />
          <Button
            @click="loadAlerts"
            label="刷新"
            icon="pi pi-search"
            :loading="loading"
          />
        </div>
      </template>
    </Card>

    <!-- 告警列表 -->
    <Card>
      <template #content>
        <DataTable
          v-model:selection="selectedAlerts"
          :value="alerts"
          :loading="loading"
          :paginator="true"
          :rows="pageSize"
          :totalRecords="totalAlerts"
          :lazy="true"
          @page="onPageChange"
          sortField="timestamp"
          :sortOrder="-1"
          dataKey="id"
          :globalFilterFields="['title', 'description', 'source']"
          v-model:filters="tableFilters"
          filterDisplay="menu"
          :rowsPerPageOptions="[10, 25, 50, 100]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="显示第 {first} 到 {last} 条告警，共 {totalRecords} 条"
          class="p-datatable-sm"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-xl font-bold">告警列表</span>
              <div class="flex gap-3">
                <IconField iconPosition="left">
                  <InputIcon>
                    <i class="pi pi-search" />
                  </InputIcon>
                  <InputText
                    v-model="tableFilters['global'].value"
                    placeholder="搜索告警..."
                  />
                </IconField>
                <Button
                  @click="batchAcknowledge"
                  icon="pi pi-check"
                  label="批量确认"
                  :disabled="selectedAlerts.length === 0"
                  severity="success"
                  outlined
                />
                <Button
                  @click="batchResolve"
                  icon="pi pi-times"
                  label="批量解决"
                  :disabled="selectedAlerts.length === 0"
                  severity="danger"
                  outlined
                />
              </div>
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

          <Column field="timestamp" header="时间" sortable>
            <template #body="{ data }">
              <div>
                <div>{{ formatDateTime(data.timestamp) }}</div>
                <small class="text-gray-500">{{ formatRelativeTime(data.timestamp) }}</small>
              </div>
            </template>
          </Column>

          <Column field="type" header="类型" sortable>
            <template #body="{ data }">
              <Tag
                :value="getTypeLabel(data.type)"
                :severity="getTypeSeverity(data.type)"
              />
            </template>
          </Column>

          <Column field="severity" header="严重程度" sortable>
            <template #body="{ data }">
              <Tag
                :value="data.severity"
                :severity="getSeveritySeverity(data.severity)"
              />
            </template>
          </Column>

          <Column field="title" header="标题" sortable>
            <template #body="{ data }">
              <div class="max-w-xs">
                <div class="font-medium">{{ data.title }}</div>
                <div class="text-sm text-gray-600 mt-1">{{ data.description }}</div>
              </div>
            </template>
          </Column>

          <Column field="source" header="来源" sortable>
            <template #body="{ data }">
              <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                {{ data.source }}
              </code>
            </template>
          </Column>

          <Column field="acknowledged" header="状态" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <Tag
                  v-if="data.resolved"
                  value="已解决"
                  severity="success"
                />
                <Tag
                  v-else-if="data.acknowledged"
                  value="已确认"
                  severity="warning"
                />
                <Tag
                  v-else
                  value="未处理"
                  severity="danger"
                />
                <div v-if="data.acknowledgedAt" class="text-xs text-gray-500">
                  {{ formatRelativeTime(data.acknowledgedAt) }}
                </div>
              </div>
            </template>
          </Column>

          <Column header="操作" style="width: 200px">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  v-if="!data.acknowledged"
                  @click="acknowledgeAlert(data)"
                  icon="pi pi-check"
                  size="small"
                  severity="success"
                  outlined
                  v-tooltip="'确认告警'"
                />
                <Button
                  v-if="!data.resolved"
                  @click="handleResolveDialog(data)"
                  icon="pi pi-times"
                  size="small"
                  severity="danger"
                  outlined
                  v-tooltip="'解决告警'"
                />
                <Button
                  @click="viewAlertDetails(data)"
                  icon="pi pi-eye"
                  size="small"
                  severity="secondary"
                  outlined
                  v-tooltip="'查看详情'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- 告警详情对话框 -->
    <Dialog
      v-model:visible="showDetailsDialog"
      :header="`告警详情 - ${selectedAlert?.title}`"
      :style="{ width: '60vw' }"
      :maximizable="true"
    >
      <div v-if="selectedAlert" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">时间</label>
            <p class="mt-1">{{ formatDateTime(selectedAlert.timestamp) }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">类型</label>
            <p class="mt-1">
              <Tag
                :value="getTypeLabel(selectedAlert.type)"
                :severity="getTypeSeverity(selectedAlert.type)"
              />
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">严重程度</label>
            <p class="mt-1">
              <Tag
                :value="selectedAlert.severity"
                :severity="getSeveritySeverity(selectedAlert.severity)"
              />
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">来源</label>
            <p class="mt-1 font-mono">{{ selectedAlert.source }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">标题</label>
          <p class="mt-1 font-semibold">{{ selectedAlert.title }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">描述</label>
          <p class="mt-1">{{ selectedAlert.description }}</p>
        </div>

        <div v-if="selectedAlert.details">
          <label class="block text-sm font-medium text-gray-700">详细信息</label>
          <div class="mt-1 bg-gray-50 p-3 rounded-lg">
            <pre class="text-sm whitespace-pre-wrap">{{ JSON.stringify(selectedAlert.details, null, 2) }}</pre>
          </div>
        </div>

        <div v-if="selectedAlert.acknowledgedBy" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">确认人</label>
            <p class="mt-1">{{ selectedAlert.acknowledgedBy }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">确认时间</label>
            <p class="mt-1">{{ formatDateTime(selectedAlert.acknowledgedAt) }}</p>
          </div>
        </div>

        <div v-if="selectedAlert.resolvedBy" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">解决人</label>
            <p class="mt-1">{{ selectedAlert.resolvedBy }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">解决时间</label>
            <p class="mt-1">{{ formatDateTime(selectedAlert.resolvedAt) }}</p>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- 解决告警对话框 -->
    <Dialog
      v-model:visible="showResolveDialog"
      header="解决告警"
      :style="{ width: '40vw' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">解决方案</label>
          <Textarea
            v-model="resolveReason"
            rows="4"
            placeholder="请描述解决方案..."
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          @click="showResolveDialog = false"
          label="取消"
          severity="secondary"
          outlined
        />
        <Button
          @click="resolveAlert"
          label="解决"
          icon="pi pi-check"
          :loading="resolving"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Alert {
  id: string
  type: 'security' | 'performance' | 'system' | 'compliance'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  source: string
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  details: any
}

interface AlertStats {
  total: number
  active: number
  critical: number
  high: number
  acknowledged: number
  resolved: number
}

const toast = useToast()

// 响应式数据
const alerts = ref<Alert[]>([])
const selectedAlerts = ref<Alert[]>([])
const selectedAlert = ref<Alert | null>(null)
const loading = ref(false)
const resolving = ref(false)
const totalAlerts = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)

// 对话框状态
const showDetailsDialog = ref(false)
const showResolveDialog = ref(false)
const resolveReason = ref('')

// 筛选器
const filters = reactive({
  type: '',
  severity: '',
  acknowledged: '',
  resolved: ''
})

const tableFilters = ref({
  global: { value: null }
})

// 统计数据
const alertStats = ref<AlertStats>({
  total: 0,
  active: 0,
  critical: 0,
  high: 0,
  acknowledged: 0,
  resolved: 0
})

// 选项数据
const typeOptions = ref([
  { label: '安全告警', value: 'security' },
  { label: '性能告警', value: 'performance' },
  { label: '系统告警', value: 'system' },
  { label: '合规告警', value: 'compliance' }
])

const severityOptions = ref([
  { label: '低风险', value: 'LOW' },
  { label: '中风险', value: 'MEDIUM' },
  { label: '高风险', value: 'HIGH' },
  { label: '关键风险', value: 'CRITICAL' }
])

const statusOptions = ref([
  { label: '未确认', value: false },
  { label: '已确认', value: true }
])

const resolvedOptions = ref([
  { label: '未解决', value: false },
  { label: '已解决', value: true }
])

// 方法
const loadAlerts = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString()
    })

    // 添加筛选参数
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') {
        params.append(key, value)
      }
    })

    const response = await $fetch(`/api/v1/admin/alerts?${params}`)

    alerts.value = response.data.alerts
    totalAlerts.value = response.data.pagination.total
    alertStats.value = response.data.stats
  } catch (error) {
    console.error('Failed to load alerts:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载告警列表，请稍后重试',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    (filters as any)[key] = ''
  })
  loadAlerts()
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadAlerts()
}

const viewAlertDetails = (alert: Alert) => {
  selectedAlert.value = alert
  showDetailsDialog.value = true
}

const acknowledgeAlert = async (alert: Alert) => {
  try {
    await $fetch(`/api/v1/admin/alerts/${alert.id}/acknowledge`, {
      method: 'POST'
    })

    toast.add({
      severity: 'success',
      summary: '操作成功',
      detail: '告警已确认',
      life: 3000
    })

    loadAlerts()
  } catch (error) {
    console.error('Failed to acknowledge alert:', error)
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: '无法确认告警，请稍后重试',
      life: 3000
    })
  }
}

const handleResolveDialog = (alert: Alert) => {
  selectedAlert.value = alert
  resolveReason.value = ''
  showResolveDialog.value = true
}

const resolveAlert = async () => {
  if (!selectedAlert.value) return

  resolving.value = true
  try {
    await $fetch(`/api/v1/admin/alerts/${selectedAlert.value.id}/resolve`, {
      method: 'POST',
      body: {
        resolution: resolveReason.value
      }
    })

    toast.add({
      severity: 'success',
      summary: '操作成功',
      detail: '告警已解决',
      life: 3000
    })

    showResolveDialog.value = false
    loadAlerts()
  } catch (error) {
    console.error('Failed to resolve alert:', error)
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: '无法解决告警，请稍后重试',
      life: 3000
    })
  } finally {
    resolving.value = false
  }
}

const batchAcknowledge = async () => {
  if (selectedAlerts.value.length === 0) return

  try {
    const promises = selectedAlerts.value.map(alert =>
      $fetch(`/api/v1/admin/alerts/${alert.id}/acknowledge`, { method: 'POST' })
    )

    await Promise.all(promises)

    toast.add({
      severity: 'success',
      summary: '操作成功',
      detail: `已确认 ${selectedAlerts.value.length} 个告警`,
      life: 3000
    })

    selectedAlerts.value = []
    loadAlerts()
  } catch (error) {
    console.error('Failed to batch acknowledge alerts:', error)
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: '批量确认失败，请稍后重试',
      life: 3000
    })
  }
}

const batchResolve = async () => {
  if (selectedAlerts.value.length === 0) return

  try {
    const promises = selectedAlerts.value.map(alert =>
      $fetch(`/api/v1/admin/alerts/${alert.id}/resolve`, {
        method: 'POST',
        body: { resolution: '批量解决' }
      })
    )

    await Promise.all(promises)

    toast.add({
      severity: 'success',
      summary: '操作成功',
      detail: `已解决 ${selectedAlerts.value.length} 个告警`,
      life: 3000
    })

    selectedAlerts.value = []
    loadAlerts()
  } catch (error) {
    console.error('Failed to batch resolve alerts:', error)
    toast.add({
      severity: 'error',
      summary: '操作失败',
      detail: '批量解决失败，请稍后重试',
      life: 3000
    })
  }
}

// 格式化函数
const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatRelativeTime = (timestamp: string) => {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  })
}

const getTypeLabel = (type: string) => {
  const option = typeOptions.value.find(opt => opt.value === type)
  return option ? option.label : type
}

const getTypeSeverity = (type: string) => {
  switch (type) {
    case 'security': return 'danger'
    case 'performance': return 'warning'
    case 'system': return 'info'
    case 'compliance': return 'secondary'
    default: return 'info'
  }
}

const getSeveritySeverity = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'danger'
    case 'HIGH': return 'warning'
    case 'MEDIUM': return 'info'
    case 'LOW': return 'success'
    default: return 'info'
  }
}

// 生命周期
onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.risk-alert {
  @apply space-y-6;
}

:deep(.p-datatable) {
  .p-datatable-header {
    @apply bg-gray-50 border-b border-gray-200;
  }

  .p-datatable-thead > tr > th {
    @apply bg-gray-50 text-gray-700 font-medium;
  }
}

:deep(.p-tag) {
  @apply text-xs;
}
</style>