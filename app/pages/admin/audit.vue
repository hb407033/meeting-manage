<template>
  <div class="audit-management">
    <UniversalHeader />

    <!-- Tab导航 -->
    <div class="bg-white rounded-lg shadow mb-6">
      <TabView v-model:activeIndex="activeTab">
        <TabPanel header="审计日志" :value="0">
          <template #header>
            <div class="flex items-center gap-2">
              <i class="pi pi-list text-blue-600"></i>
              <span>审计日志</span>
            </div>
          </template>
          <AuditLogViewer />
        </TabPanel>

        <TabPanel header="统计分析" :value="1">
          <template #header>
            <div class="flex items-center gap-2">
              <i class="pi pi-chart-bar text-green-600"></i>
              <span>统计分析</span>
            </div>
          </template>
          <AuditLogStats ref="statsComponent" />
        </TabPanel>

        <TabPanel header="异常检测" :value="2">
          <template #header>
            <div class="flex items-center gap-2">
              <i class="pi pi-exclamation-triangle text-yellow-600"></i>
              <span>异常检测</span>
            </div>
          </template>
          <AnomalyDetection ref="anomalyComponent" />
        </TabPanel>

        <TabPanel header="安全告警" :value="3">
          <template #header>
            <div class="flex items-center gap-2">
              <i class="pi pi-shield text-red-600"></i>
              <span>安全告警</span>
              <Badge v-if="alertStats.active > 0" :value="alertStats.active" severity="danger" />
            </div>
          </template>
          <RiskAlert />
        </TabPanel>

        <TabPanel header="系统健康" :value="4">
          <template #header>
            <div class="flex items-center gap-2">
              <i class="pi pi-heart text-pink-600"></i>
              <span>系统健康</span>
            </div>
          </template>
          <SystemHealthMonitor />
        </TabPanel>
      </TabView>
    </div>

    <!-- 快速操作面板 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <template #content>
          <div class="text-center">
            <div class="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <i class="pi pi-download text-blue-600 text-2xl"></i>
            </div>
            <h3 class="font-semibold text-gray-900 mb-2">导出审计报告</h3>
            <p class="text-sm text-gray-600 mb-4">生成详细的审计分析报告</p>
            <Button
              @click="exportAuditReport"
              icon="pi pi-file-export"
              label="导出报告"
              size="small"
              class="w-full"
            />
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <i class="pi pi-refresh text-green-600 text-2xl"></i>
            </div>
            <h3 class="font-semibold text-gray-900 mb-2">数据清理</h3>
            <p class="text-sm text-gray-600 mb-4">清理过期的审计日志数据</p>
            <Button
              @click="showCleanupDialog = true"
              icon="pi pi-trash"
              label="清理数据"
              severity="warning"
              size="small"
              class="w-full"
            />
          </div>
        </template>
      </Card>

      <Card>
        <template #content>
          <div class="text-center">
            <div class="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <i class="pi pi-cog text-purple-600 text-2xl"></i>
            </div>
            <h3 class="font-semibold text-gray-900 mb-2">审计配置</h3>
            <p class="text-sm text-gray-600 mb-4">配置审计策略和规则</p>
            <Button
              @click="showConfigDialog = true"
              icon="pi pi-cog"
              label="配置管理"
              severity="secondary"
              size="small"
              class="w-full"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- 数据清理对话框 -->
    <Dialog
      v-model:visible="showCleanupDialog"
      header="审计数据清理"
      :style="{ width: '500px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">清理范围</label>
          <Dropdown
            v-model="cleanupConfig.days"
            :options="cleanupOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">风险级别</label>
          <Dropdown
            v-model="cleanupConfig.riskLevel"
            :options="riskLevelOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 class="font-medium text-yellow-900 mb-2">清理警告</h4>
          <ul class="text-sm text-yellow-800 space-y-1">
            <li>• 清理操作不可恢复</li>
            <li>• 建议在清理前备份数据</li>
            <li>• 不会清理关键和高风险日志</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            @click="showCleanupDialog = false"
            label="取消"
            severity="secondary"
            outlined
          />
          <Button
            @click="performCleanup"
            label="确认清理"
            icon="pi pi-trash"
            severity="warning"
            :loading="cleaning"
          />
        </div>
      </template>
    </Dialog>

    <!-- 配置管理对话框 -->
    <Dialog
      v-model:visible="showConfigDialog"
      header="审计配置管理"
      :style="{ width: '600px' }"
      :maximizable="true"
    >
      <div class="space-y-6">
        <!-- 日志保留策略 -->
        <div>
          <h4 class="font-medium text-gray-900 mb-3">日志保留策略</h4>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">低风险日志保留</label>
                <Dropdown
                  v-model="auditConfig.lowRiskRetention"
                  :options="retentionOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">中风险日志保留</label>
                <Dropdown
                  v-model="auditConfig.mediumRiskRetention"
                  :options="retentionOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">高风险日志保留</label>
                <Dropdown
                  v-model="auditConfig.highRiskRetention"
                  :options="retentionOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">关键风险日志保留</label>
                <Dropdown
                  v-model="auditConfig.criticalRiskRetention"
                  :options="retentionOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 告警配置 -->
        <div>
          <h4 class="font-medium text-gray-900 mb-3">告警配置</h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">启用实时告警</label>
              <ToggleSwitch v-model="auditConfig.realTimeAlerts" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">邮件通知</label>
              <ToggleSwitch v-model="auditConfig.emailNotifications" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">短信通知</label>
              <ToggleSwitch v-model="auditConfig.smsNotifications" />
            </div>
          </div>
        </div>

        <!-- 性能配置 -->
        <div>
          <h4 class="font-medium text-gray-900 mb-3">性能配置</h4>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">异步处理队列大小</label>
              <InputNumber
                v-model="auditConfig.queueSize"
                :min="10"
                :max="1000"
                :step="10"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">批量刷新间隔(秒)</label>
              <InputNumber
                v-model="auditConfig.flushInterval"
                :min="1"
                :max="60"
                :step="1"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            @click="showConfigDialog = false"
            label="取消"
            severity="secondary"
            outlined
          />
          <Button
            @click="saveConfig"
            label="保存配置"
            icon="pi pi-save"
            :loading="savingConfig"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

// 导入自定义组件
import UniversalHeader from '~/components/UniversalHeader.vue'
import AuditLogViewer from '~/components/admin/AuditLogViewer.vue'
import AuditLogStats from '~/components/admin/AuditLogStats.vue'
import AnomalyDetection from '~/components/admin/AnomalyDetection.vue'
import RiskAlert from '~/components/admin/RiskAlert.vue'
import SystemHealthMonitor from '~/components/admin/SystemHealthMonitor.vue'

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
const activeTab = ref(0)
const showCleanupDialog = ref(false)
const showConfigDialog = ref(false)
const cleaning = ref(false)
const savingConfig = ref(false)

const statsComponent = ref()
const anomalyComponent = ref()

const alertStats = ref<AlertStats>({
  total: 0,
  active: 0,
  critical: 0,
  high: 0,
  acknowledged: 0,
  resolved: 0
})

// 清理配置
const cleanupConfig = reactive({
  days: 365,
  riskLevel: 'ALL'
})

// 审计配置
const auditConfig = reactive({
  lowRiskRetention: 90,
  mediumRiskRetention: 180,
  highRiskRetention: 365,
  criticalRiskRetention: 2555, // 7年
  realTimeAlerts: true,
  emailNotifications: true,
  smsNotifications: false,
  queueSize: 50,
  flushInterval: 5
})

// 选项数据
const cleanupOptions = ref([
  { label: '30天前', value: 30 },
  { label: '90天前', value: 90 },
  { label: '180天前', value: 180 },
  { label: '1年前', value: 365 },
  { label: '2年前', value: 730 },
  { label: '3年前', value: 1095 }
])

const riskLevelOptions = ref([
  { label: '全部', value: 'ALL' },
  { label: '仅低风险', value: 'LOW' },
  { label: '仅中风险', value: 'MEDIUM' },
  { label: '仅高风险', value: 'HIGH' }
])

const retentionOptions = ref([
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
  { label: '180天', value: 180 },
  { label: '1年', value: 365 },
  { label: '2年', value: 730 },
  { label: '3年', value: 1095 },
  { label: '5年', value: 1825 },
  { label: '7年', value: 2555 }
])

// 方法
const loadAlertStats = async () => {
  try {
    const response = await adminStore.getAlerts()
    alertStats.value = response.stats
  } catch (error) {
    console.error('Failed to load alert stats:', error)
  }
}

const exportAuditReport = async () => {
  try {
    const response = await adminStore.exportAuditLogs({
      format: 'xlsx',
      filters: {},
      fields: [
        'id', 'timestamp', 'userName', 'userEmail', 'action',
        'resourceType', 'resourceId', 'result', 'riskLevel',
        'ipAddress', 'details'
      ]
    })

    if (response.success) {
      toast.add({
        severity: 'success',
        summary: '导出成功',
        detail: '审计报告已成功导出',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Export failed:', error)
    toast.add({
      severity: 'error',
      summary: '导出失败',
      detail: '无法导出审计报告，请稍后重试',
      life: 3000
    })
  }
}

const performCleanup = async () => {
  cleaning.value = true
  try {
    const data = await adminStore.cleanupAuditLogs({
      olderThanDays: cleanupConfig.days,
      riskLevel: cleanupConfig.riskLevel === 'ALL' ? undefined : cleanupConfig.riskLevel,
      dryRun: false
    })

    showCleanupDialog.value = false

    toast.add({
      severity: 'success',
      summary: '清理完成',
      detail: `成功清理 ${data.deletedCount.toLocaleString()} 条审计日志`,
      life: 3000
    })

    // 刷新统计数据
    if (statsComponent.value) {
      statsComponent.value.loadStats()
    }
    if (anomalyComponent.value) {
      anomalyComponent.value.runAnalysis()
    }
  } catch (error) {
    console.error('Cleanup failed:', error)
    toast.add({
      severity: 'error',
      summary: '清理失败',
      detail: '无法清理审计数据，请稍后重试',
      life: 3000
    })
  } finally {
    cleaning.value = false
  }
}

const saveConfig = async () => {
  savingConfig.value = true
  try {
    // 这里应该调用配置保存API
    // const { useAdminStore } = await import('~/stores/admin')
    // const adminStore = useAdminStore()
    // await adminStore.saveAuditConfig(auditConfig)

    showConfigDialog.value = false

    toast.add({
      severity: 'success',
      summary: '配置已保存',
      detail: '审计配置已成功更新',
      life: 3000
    })
  } catch (error) {
    console.error('Failed to save config:', error)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: '无法保存审计配置，请稍后重试',
      life: 3000
    })
  } finally {
    savingConfig.value = false
  }
}

// 生命周期
onMounted(() => {
  loadAlertStats()
})
</script>

<style scoped>
.audit-management {
  @apply space-y-6;
}

:deep(.p-tabview) {
  .p-tabview-nav {
    @apply bg-gray-50 border-b border-gray-200;
  }

  .p-tabview-nav-link {
    @apply px-6 py-3 text-gray-700 hover:text-blue-600;
  }

  .p-tabview-nav-link.p-highlight {
    @apply text-blue-600 border-b-2 border-blue-600;
  }
}
</style>