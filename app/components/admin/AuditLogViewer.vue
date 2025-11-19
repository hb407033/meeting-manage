<template>
  <div class="audit-log-viewer">
    <!-- 页面头部 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">审计日志管理</h1>
        <p class="text-gray-600 mt-1">查看和管理系统操作审计日志</p>
      </div>

      <div class="flex gap-3">
        <Button
          @click="exportLogs"
          icon="pi pi-download"
          label="导出日志"
          :disabled="loading || selectedLogs.length === 0"
        />
        <Button
          @click="showStatsDialog = true"
          icon="pi pi-chart-bar"
          label="统计分析"
          severity="secondary"
        />
        <Button
          @click="showAnomaliesDialog = true"
          icon="pi pi-exclamation-triangle"
          label="异常检测"
          severity="warning"
        />
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <i class="pi pi-list text-blue-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">总日志数</p>
            <p class="text-xl font-semibold text-gray-900">{{ stats.totalLogs.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <i class="pi pi-check-circle text-green-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">成功率</p>
            <p class="text-xl font-semibold text-gray-900">{{ successRate }}%</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-100 rounded-lg">
            <i class="pi pi-exclamation-triangle text-yellow-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">高风险操作</p>
            <p class="text-xl font-semibold text-gray-900">{{ stats.highRiskCount.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div class="flex items-center">
          <div class="p-3 bg-red-100 rounded-lg">
            <i class="pi pi-times-circle text-red-600 text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">失败操作</p>
            <p class="text-xl font-semibold text-gray-900">{{ stats.failureCount.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <Card class="mb-6">
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">用户</label>
            <InputText
              v-model="filters.userId"
              placeholder="用户ID或邮箱"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">操作类型</label>
            <InputText
              v-model="filters.action"
              placeholder="搜索操作"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
            <Dropdown
              v-model="filters.resourceType"
              :options="resourceTypes"
              placeholder="选择资源类型"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">操作结果</label>
            <Dropdown
              v-model="filters.result"
              :options="resultOptions"
              placeholder="选择结果"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">风险级别</label>
            <Dropdown
              v-model="filters.riskLevel"
              :options="riskLevelOptions"
              placeholder="选择风险级别"
              class="w-full"
              showClear
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">IP地址</label>
            <InputText
              v-model="filters.ipAddress"
              placeholder="IP地址"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
            <Calendar
              v-model="filters.startDate"
              placeholder="开始时间"
              dateFormat="yy-mm-dd"
              class="w-full"
              showTime
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
            <Calendar
              v-model="filters.endDate"
              placeholder="结束时间"
              dateFormat="yy-mm-dd"
              class="w-full"
              showTime
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
            @click="searchLogs"
            label="搜索"
            icon="pi pi-search"
            :loading="loading"
          />
        </div>
      </template>
    </Card>

    <!-- 日志表格 -->
    <Card>
      <template #content>
        <DataTable
          v-model:selection="selectedLogs"
          :value="logs"
          :loading="loading"
          :paginator="true"
          :rows="pageSize"
          :totalRecords="totalLogs"
          :lazy="true"
          @page="onPageChange"
          @sort="onSort"
          sortField="timestamp"
          :sortOrder="-1"
          dataKey="id"
          :globalFilterFields="['userName', 'action', 'resourceType', 'ipAddress']"
          v-model:filters="tableFilters"
          filterDisplay="menu"
          :rowsPerPageOptions="[10, 25, 50, 100]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="显示第 {first} 到 {last} 条记录，共 {totalRecords} 条"
          class="p-datatable-sm"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-xl font-bold">审计日志列表</span>
              <div class="flex gap-3">
                <IconField iconPosition="left">
                  <InputIcon>
                    <i class="pi pi-search" />
                  </InputIcon>
                  <InputText
                    v-model="tableFilters['global'].value"
                    placeholder="搜索日志..."
                  />
                </IconField>
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

          <Column field="userName" header="用户" sortable>
            <template #body="{ data }">
              <div v-if="data.userName">
                <div class="font-medium">{{ data.userName }}</div>
                <small class="text-gray-500">{{ data.userEmail }}</small>
              </div>
              <span v-else class="text-gray-400">系统</span>
            </template>
          </Column>

          <Column field="action" header="操作" sortable>
            <template #body="{ data }">
              <div class="max-w-xs">
                <code class="text-sm bg-gray-100 px-2 py-1 rounded">{{ data.action }}</code>
              </div>
            </template>
          </Column>

          <Column field="resourceType" header="资源" sortable>
            <template #body="{ data }">
              <div>
                <div class="font-medium">{{ data.resourceType }}</div>
                <small v-if="data.resourceId" class="text-gray-500">ID: {{ data.resourceId }}</small>
              </div>
            </template>
          </Column>

          <Column field="result" header="结果" sortable>
            <template #body="{ data }">
              <Tag
                :value="data.result"
                :severity="getResultSeverity(data.result)"
              />
            </template>
          </Column>

          <Column field="riskLevel" header="风险" sortable>
            <template #body="{ data }">
              <Tag
                :value="data.riskLevel"
                :severity="getRiskSeverity(data.riskLevel)"
              />
            </template>
          </Column>

          <Column field="ipAddress" header="IP地址" sortable>
            <template #body="{ data }">
              <code class="text-sm bg-gray-100 px-2 py-1 rounded">
                {{ data.ipAddress || '-' }}
              </code>
            </template>
          </Column>

          <Column header="操作" style="width: 120px">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  @click="viewLogDetails(data)"
                  icon="pi pi-eye"
                  size="small"
                  severity="secondary"
                  outlined
                />
                <Button
                  @click="exportSingleLog(data)"
                  icon="pi pi-download"
                  size="small"
                  severity="secondary"
                  outlined
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- 日志详情对话框 -->
    <Dialog
      v-model:visible="showDetailsDialog"
      :header="`日志详情 - ${selectedLog?.action}`"
      :style="{ width: '70vw' }"
      :maximizable="true"
    >
      <div v-if="selectedLog" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">时间</label>
            <p class="mt-1">{{ formatDateTime(selectedLog.timestamp) }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">操作结果</label>
            <p class="mt-1">
              <Tag
                :value="selectedLog.result"
                :severity="getResultSeverity(selectedLog.result)"
              />
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">风险级别</label>
            <p class="mt-1">
              <Tag
                :value="selectedLog.riskLevel"
                :severity="getRiskSeverity(selectedLog.riskLevel)"
              />
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">IP地址</label>
            <p class="mt-1 font-mono">{{ selectedLog.ipAddress || '-' }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">用户信息</label>
          <p class="mt-1">
            {{ selectedLog.userName || '系统' }}
            <span v-if="selectedLog.userEmail" class="text-gray-500">({{ selectedLog.userEmail }})</span>
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">操作详情</label>
          <p class="mt-1">
            <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ selectedLog.action }}</span>
            <span class="mx-2">→</span>
            <span class="font-medium">{{ selectedLog.resourceType }}</span>
            <span v-if="selectedLog.resourceId" class="text-gray-500">({{ selectedLog.resourceId }})</span>
          </p>
        </div>

        <div v-if="selectedLog.details">
          <label class="block text-sm font-medium text-gray-700">详细信息</label>
          <div class="mt-1 bg-gray-50 p-3 rounded-lg">
            <pre class="text-sm whitespace-pre-wrap">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- 统计分析对话框 -->
    <Dialog
      v-model:visible="showStatsDialog"
      header="审计日志统计分析"
      :style="{ width: '80vw' }"
      :maximizable="true"
    >
      <AuditLogStats @refresh="loadStats" />
    </Dialog>

    <!-- 异常检测对话框 -->
    <Dialog
      v-model:visible="showAnomaliesDialog"
      header="异常行为检测"
      :style="{ width: '80vw' }"
      :maximizable="true"
    >
      <AnomalyDetection @refresh="loadStats" />
    </Dialog>

    <!-- 导出对话框 -->
    <Dialog
      v-model:visible="showExportDialog"
      header="导出审计日志"
      :style="{ width: '50vw' }"
    >
      <LogExporter
        :filters="exportFilters"
        :selected-count="selectedLogs.length"
        @export="handleExport"
        @cancel="showExportDialog = false"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface AuditLog {
  id: string
  userId?: string
  userName?: string
  userEmail?: string
  action: string
  resourceType: string
  resourceId?: string
  result: string
  riskLevel: string
  ipAddress?: string
  timestamp: string
  details?: any
}

interface Stats {
  totalLogs: number
  successCount: number
  failureCount: number
  highRiskCount: number
}

const toast = useToast()

// 响应式数据
const logs = ref<AuditLog[]>([])
const selectedLogs = ref<AuditLog[]>([])
const selectedLog = ref<AuditLog | null>(null)
const loading = ref(false)
const totalLogs = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)

// 对话框状态
const showDetailsDialog = ref(false)
const showStatsDialog = ref(false)
const showAnomaliesDialog = ref(false)
const showExportDialog = ref(false)

// 筛选器
const filters = reactive({
  userId: '',
  action: '',
  resourceType: '',
  result: '',
  riskLevel: '',
  ipAddress: '',
  startDate: null as Date | null,
  endDate: null as Date | null
})

const tableFilters = ref({
  global: { value: null }
})

// 统计数据
const stats = ref<Stats>({
  totalLogs: 0,
  successCount: 0,
  failureCount: 0,
  highRiskCount: 0
})

// 选项数据
const resourceTypes = ref([
  'auth', 'user', 'role', 'permission', 'room', 'reservation', 'system', 'audit'
])

const resultOptions = ref([
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILURE' },
  { label: '部分成功', value: 'PARTIAL' },
  { label: '错误', value: 'ERROR' }
])

const riskLevelOptions = ref([
  { label: '低风险', value: 'LOW' },
  { label: '中风险', value: 'MEDIUM' },
  { label: '高风险', value: 'HIGH' },
  { label: '关键风险', value: 'CRITICAL' }
])

// 计算属性
const successRate = computed(() => {
  if (stats.value.totalLogs === 0) return 0
  return Math.round((stats.value.successCount / stats.value.totalLogs) * 100)
})

const exportFilters = computed(() => {
  if (selectedLogs.value.length > 0) {
    return { ids: selectedLogs.value.map(log => log.id) }
  }
  return { ...filters }
})

// 方法
const loadLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString()
    })

    // 添加筛选参数
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value instanceof Date ? value.toISOString() : value)
      }
    })

    const response = await $fetch(`/api/v1/admin/audit-logs?${params}`)

    logs.value = response.data.logs
    totalLogs.value = response.data.pagination.total
  } catch (error) {
    console.error('Failed to load audit logs:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载审计日志，请稍后重试',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await $fetch('/api/v1/admin/audit-logs/stats')
    const data = response.data

    stats.value = {
      totalLogs: data.summary.totalLogs,
      successCount: data.distributions.result.SUCCESS || 0,
      failureCount: data.distributions.result.FAILURE || 0,
      highRiskCount: data.distributions.riskLevel.HIGH + data.distributions.riskLevel.CRITICAL || 0
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const searchLogs = () => {
  currentPage.value = 1
  loadLogs()
}

const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    (filters as any)[key] = key === 'startDate' || key === 'endDate' ? null : ''
  })
  searchLogs()
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadLogs()
}

const onSort = (event: any) => {
  // 处理排序
  loadLogs()
}

const viewLogDetails = (log: AuditLog) => {
  selectedLog.value = log
  showDetailsDialog.value = true
}

const exportLogs = () => {
  if (selectedLogs.value.length === 0 && !hasActiveFilters()) {
    toast.add({
      severity: 'warn',
      summary: '请选择数据',
      detail: '请选择要导出的日志记录或设置筛选条件',
      life: 3000
    })
    return
  }
  showExportDialog.value = true
}

const exportSingleLog = (log: AuditLog) => {
  selectedLogs.value = [log]
  showExportDialog.value = true
}

const handleExport = async (format: string) => {
  try {
    const response = await $fetch('/api/v1/admin/audit-logs/export', {
      method: 'POST',
      body: {
        format,
        filters: exportFilters.value,
        fields: [
          'id', 'timestamp', 'userName', 'userEmail', 'action',
          'resourceType', 'resourceId', 'result', 'riskLevel',
          'ipAddress', 'details'
        ]
      }
    })

    // 创建下载链接
    const blob = new Blob([response], {
      type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
            format === 'csv' ? 'text/csv' : 'application/json'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showExportDialog.value = false
    selectedLogs.value = []

    toast.add({
      severity: 'success',
      summary: '导出成功',
      detail: '审计日志已成功导出',
      life: 3000
    })
  } catch (error) {
    console.error('Export failed:', error)
    toast.add({
      severity: 'error',
      summary: '导出失败',
      detail: '无法导出审计日志，请稍后重试',
      life: 3000
    })
  }
}

const hasActiveFilters = () => {
  return Object.values(filters).some(value => value !== '' && value !== null)
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

const getResultSeverity = (result: string) => {
  switch (result) {
    case 'SUCCESS': return 'success'
    case 'FAILURE': return 'danger'
    case 'PARTIAL': return 'warning'
    case 'ERROR': return 'danger'
    default: return 'info'
  }
}

const getRiskSeverity = (riskLevel: string) => {
  switch (riskLevel) {
    case 'LOW': return 'success'
    case 'MEDIUM': return 'info'
    case 'HIGH': return 'warning'
    case 'CRITICAL': return 'danger'
    default: return 'info'
  }
}

// 生命周期
onMounted(() => {
  loadLogs()
  loadStats()
})
</script>

<style scoped>
.audit-log-viewer {
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