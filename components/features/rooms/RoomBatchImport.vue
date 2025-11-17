<template>
  <div class="room-batch-import">
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-upload"></i>
          <span>批量导入会议室</span>
        </div>
      </template>

      <template #content>
        <!-- 步骤指示器 -->
        <Steps :model="steps" :activeIndex="currentStep" class="mb-6" />

        <!-- 步骤 1: 下载模板 -->
        <div v-if="currentStep === 0" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-blue-800 mb-2">
              <i class="pi pi-info-circle mr-2"></i>
              导入说明
            </h3>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• 请先下载CSV模板文件，按照模板格式填写会议室信息</li>
              <li>• 必填字段：会议室名称、容量</li>
              <li>• 可选字段：描述、位置、设备配置、图片、状态、规则、是否需要审批</li>
              <li>• 设备配置、图片、规则字段需要使用JSON格式</li>
              <li>• 状态可选值：AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED, DISABLED</li>
            </ul>
          </div>

          <div class="flex justify-center">
            <Button
              label="下载CSV模板"
              icon="pi pi-download"
              @click="downloadTemplate"
              class="p-button-outlined"
            />
          </div>

          <div class="flex justify-end">
            <Button
              label="下一步"
              icon="pi pi-arrow-right"
              @click="nextStep"
              :disabled="!templateDownloaded"
            />
          </div>
        </div>

        <!-- 步骤 2: 上传文件 -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div v-if="!selectedFile" class="space-y-4">
              <i class="pi pi-file-upload text-4xl text-gray-400"></i>
              <div>
                <p class="text-lg font-medium text-gray-700">选择CSV文件</p>
                <p class="text-sm text-gray-500">或将文件拖拽到此区域</p>
              </div>
              <div>
                <label for="csv-file" class="p-button p-button-outlined cursor-pointer">
                  <i class="pi pi-folder-open mr-2"></i>
                  选择文件
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  @change="handleFileSelect"
                  class="hidden"
                />
              </div>
            </div>

            <div v-else class="space-y-4">
              <i class="pi pi-file text-4xl text-green-500"></i>
              <div>
                <p class="text-lg font-medium text-gray-700">{{ selectedFile.name }}</p>
                <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <Button
                label="重新选择"
                icon="pi pi-refresh"
                class="p-button-outlined p-button-sm"
                @click="clearFile"
              />
            </div>
          </div>

          <div class="flex justify-between">
            <Button
              label="上一步"
              icon="pi pi-arrow-left"
              @click="previousStep"
              class="p-button-outlined"
            />
            <Button
              label="预览数据"
              icon="pi pi-eye"
              @click="previewData"
              :disabled="!selectedFile || isLoading"
              :loading="isLoading"
            />
          </div>
        </div>

        <!-- 步骤 3: 预览和确认 -->
        <div v-if="currentStep === 2" class="space-y-4">
          <div v-if="previewData.length > 0">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">数据预览</h3>
              <span class="text-sm text-gray-600">
                共 {{ previewData.length }} 条记录
              </span>
            </div>

            <!-- 数据表格预览 -->
            <DataTable
              :value="previewData.slice(0, 5)"
              scrollable
              scrollHeight="300px"
              class="mb-4"
            >
              <Column field="name" header="会议室名称" />
              <Column field="description" header="描述" />
              <Column field="capacity" header="容量" />
              <Column field="location" header="位置" />
              <Column field="status" header="状态" />
            </DataTable>

            <div v-if="previewData.length > 5" class="text-center text-sm text-gray-600 mb-4">
              还有 {{ previewData.length - 5 }} 条记录...
            </div>

            <!-- 错误信息 -->
            <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 class="text-red-800 font-semibold mb-2">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                数据验证错误
              </h4>
              <div class="space-y-1 max-h-40 overflow-y-auto">
                <div v-for="error in validationErrors" :key="error.row" class="text-sm text-red-700">
                  第 {{ error.row }} 行: {{ error.message }}
                </div>
              </div>
            </div>

            <!-- 确认对话框 -->
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 class="text-yellow-800 font-semibold mb-2">
                <i class="pi pi-info-circle mr-2"></i>
                确认导入
              </h4>
              <p class="text-sm text-yellow-700">
                确认要导入这些会议室数据吗？此操作将创建 {{ validData.length }} 个会议室。
              </p>
            </div>
          </div>

          <div v-else-if="isLoading" class="text-center py-8">
            <ProgressSpinner />
            <p class="mt-4 text-gray-600">正在处理数据...</p>
          </div>

          <div class="flex justify-between">
            <Button
              label="上一步"
              icon="pi pi-arrow-left"
              @click="previousStep"
              class="p-button-outlined"
            />
            <Button
              label="确认导入"
              icon="pi pi-check"
              @click="confirmImport"
              :disabled="!selectedFile || isLoading || validData.length === 0"
              :loading="isImporting"
            />
          </div>
        </div>

        <!-- 步骤 4: 导入结果 -->
        <div v-if="currentStep === 3" class="space-y-4">
          <div v-if="importResult">
            <div class="text-center mb-6">
              <i class="text-6xl" :class="importResult.successCount > 0 ? 'pi pi-check-circle text-green-500' : 'pi pi-times-circle text-red-500'"></i>
              <h3 class="text-xl font-semibold mt-4">
                导入{{ importResult.successCount > 0 ? '成功' : '失败' }}
              </h3>
            </div>

            <!-- 结果统计 -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-blue-50 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-blue-600">{{ importResult.totalRows }}</div>
                <div class="text-sm text-blue-600">总记录数</div>
              </div>
              <div class="bg-green-50 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-green-600">{{ importResult.successCount }}</div>
                <div class="text-sm text-green-600">成功导入</div>
              </div>
              <div class="bg-red-50 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-red-600">{{ importResult.errorCount }}</div>
                <div class="text-sm text-red-600">导入失败</div>
              </div>
            </div>

            <!-- 成功列表 -->
            <div v-if="importResult.createdRooms && importResult.createdRooms.length > 0" class="mb-4">
              <h4 class="font-semibold mb-2">成功导入的会议室:</h4>
              <DataTable :value="importResult.createdRooms" scrollable scrollHeight="200px">
                <Column field="row" header="行号" />
                <Column field="name" header="会议室名称" />
                <Column field="id" header="ID" />
              </DataTable>
            </div>

            <!-- 错误列表 -->
            <div v-if="importResult.errors && importResult.errors.length > 0">
              <h4 class="font-semibold mb-2 text-red-700">导入错误:</h4>
              <DataTable :value="importResult.errors" scrollable scrollHeight="200px">
                <Column field="row" header="行号" />
                <Column field="error" header="错误信息" />
              </DataTable>
            </div>
          </div>

          <div class="flex justify-center">
            <Button
              label="完成"
              icon="pi pi-check"
              @click="$emit('complete')"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
interface Step {
  label: string
}

interface PreviewData {
  name: string
  description?: string
  capacity: number
  location?: string
  status: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  data: any
}

interface ImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  createdRooms?: Array<{ row: number; id: string; name: string }>
  errors?: Array<{ row: number; error: string }>
}

const emit = defineEmits<{
  complete: []
}>()

// 响应式数据
const currentStep = ref(0)
const templateDownloaded = ref(false)
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const isImporting = ref(false)
const previewData = ref<PreviewData[]>([])
const validationErrors = ref<ValidationError[]>([])
const validData = ref<any[]>([])
const importResult = ref<ImportResult | null>(null)

// 步骤定义
const steps = ref<Step[]>([
  { label: '下载模板' },
  { label: '上传文件' },
  { label: '预览确认' },
  { label: '导入结果' }
])

// 方法
const nextStep = () => {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const downloadTemplate = async () => {
  try {
    const response = await $fetch('/api/v1/rooms/template')

    // 创建下载链接
    const blob = new Blob([response as string], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'meeting-rooms-template.csv'
    link.click()
    window.URL.revokeObjectURL(url)

    templateDownloaded.value = true

    // 显示成功消息
    useToast().add({
      severity: 'success',
      summary: '模板下载成功',
      detail: 'CSV模板文件已下载到本地',
      life: 3000
    })
  } catch (error) {
    console.error('下载模板失败:', error)
    useToast().add({
      severity: 'error',
      summary: '下载失败',
      detail: '模板文件下载失败，请重试',
      life: 3000
    })
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      useToast().add({
        severity: 'error',
        summary: '文件格式错误',
        detail: '请选择CSV格式的文件',
        life: 3000
      })
      return
    }
    selectedFile.value = file
  }
}

const clearFile = () => {
  selectedFile.value = null
  previewData.value = []
  validationErrors.value = []
  validData.value = []
}

const previewData = async () => {
  if (!selectedFile.value) return

  isLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await $fetch('/api/v1/rooms/import/preview', {
      method: 'POST',
      body: formData
    })

    if (response.success) {
      previewData.value = response.data.previewData
      validationErrors.value = response.data.errors || []
      validData.value = response.data.validData || []

      if (validationErrors.value.length > 0) {
        useToast().add({
          severity: 'warn',
          summary: '数据验证警告',
          detail: `发现 ${validationErrors.value.length} 个数据错误，请检查后继续`,
          life: 5000
        })
      }
    } else {
      throw new Error(response.message || '预览失败')
    }
  } catch (error) {
    console.error('预览数据失败:', error)
    useToast().add({
      severity: 'error',
      summary: '预览失败',
      detail: error.message || '文件解析失败，请检查文件格式',
      life: 3000
    })
  } finally {
    isLoading.value = false
  }
}

const confirmImport = async () => {
  if (!selectedFile.value || validData.value.length === 0) return

  isImporting.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await $fetch('/api/v1/rooms/import', {
      method: 'POST',
      body: formData
    })

    if (response.success) {
      importResult.value = response.data

      useToast().add({
        severity: 'success',
        summary: '导入成功',
        detail: `成功导入 ${response.data.successCount} 个会议室`,
        life: 3000
      })

      nextStep()
    } else {
      throw new Error(response.message || '导入失败')
    }
  } catch (error) {
    console.error('导入失败:', error)
    useToast().add({
      severity: 'error',
      summary: '导入失败',
      detail: error.message || '会议室数据导入失败，请重试',
      life: 3000
    })
  } finally {
    isImporting.value = false
  }
}

// 组件挂载时重置状态
onMounted(() => {
  currentStep.value = 0
  templateDownloaded.value = false
  selectedFile.value = null
  previewData.value = []
  validationErrors.value = []
  validData.value = []
  importResult.value = null
})
</script>

<style scoped>
.room-batch-import {
  max-width: 800px;
  margin: 0 auto;
}

:deep(.p-steps .p-steps-item .p-steps-number) {
  background-color: #e5e7eb;
  color: #6b7280;
}

:deep(.p-steps .p-steps-item.p-highlight .p-steps-number) {
  background-color: #3b82f6;
  color: white;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.5rem;
  font-size: 0.875rem;
}

.border-dashed {
  border-style: dashed;
}
</style>