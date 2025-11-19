<template>
  <div class="log-exporter">
    <!-- 导出选项 -->
    <div class="space-y-4">
      <!-- 数据范围 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">导出数据范围</label>
        <div class="space-y-2">
          <div class="flex items-center">
            <RadioButton
              v-model="exportScope"
              value="selected"
              inputId="selected"
              :disabled="selectedCount === 0"
            />
            <label for="selected" class="ml-2">
              选中的记录 ({{ selectedCount }} 条)
            </label>
          </div>
          <div class="flex items-center">
            <RadioButton
              v-model="exportScope"
              value="filtered"
              inputId="filtered"
              :disabled="!hasActiveFilters"
            />
            <label for="filtered" class="ml-2">
              符合筛选条件的记录
            </label>
          </div>
          <div class="flex items-center">
            <RadioButton
              v-model="exportScope"
              value="all"
              inputId="all"
            />
            <label for="all" class="ml-2">
              所有记录 (不推荐)
            </label>
          </div>
        </div>
      </div>

      <!-- 文件格式 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="format in formatOptions"
            :key="format.value"
            class="border rounded-lg p-3 cursor-pointer transition-colors"
            :class="{
              'border-blue-500 bg-blue-50': selectedFormat === format.value,
              'border-gray-300 hover:border-gray-400': selectedFormat !== format.value
            }"
            @click="selectedFormat = format.value"
          >
            <div class="text-center">
              <i :class="format.icon" class="text-2xl mb-2" :class="format.iconColor"></i>
              <div class="font-medium">{{ format.label }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ format.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 字段选择 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">导出字段</label>
        <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          <div
            v-for="field in fieldOptions"
            :key="field.value"
            class="flex items-center p-2 hover:bg-gray-50 rounded"
          >
            <Checkbox
              v-model="selectedFields"
              :value="field.value"
              :inputId="field.value"
            />
            <label :for="field.value" class="ml-2 text-sm">{{ field.label }}</label>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <button
            @click="toggleAllFields"
            class="text-sm text-blue-600 hover:text-blue-800"
          >
            {{ allFieldsSelected ? '取消全选' : '全选' }}
          </button>
          <span class="text-sm text-gray-500">
            已选择 {{ selectedFields.length }} 个字段
          </span>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="border-t pt-4">
        <button
          @click="showAdvancedOptions = !showAdvancedOptions"
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <i class="pi pi-cog"></i>
          高级选项
          <i
            class="pi pi-chevron-down transition-transform"
            :class="{ 'rotate-180': showAdvancedOptions }"
          />
        </button>

        <div v-show="showAdvancedOptions" class="mt-4 space-y-4">
          <!-- 文件名 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">自定义文件名 (可选)</label>
            <InputText
              v-model="customFilename"
              placeholder="audit-logs"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              不包含扩展名，系统会自动添加时间戳和格式后缀
            </p>
          </div>

          <!-- 附加筛选 -->
          <div v-if="exportScope === 'all'">
            <label class="block text-sm font-medium text-gray-700 mb-2">时间范围限制</label>
            <div class="grid grid-cols-2 gap-3">
              <Calendar
                v-model="advancedFilters.startDate"
                placeholder="开始日期"
                dateFormat="yy-mm-dd"
                showTime
              />
              <Calendar
                v-model="advancedFilters.endDate"
                placeholder="结束日期"
                dateFormat="yy-mm-dd"
                showTime
              />
            </div>
          </div>

          <!-- 压缩选项 -->
          <div>
            <div class="flex items-center">
              <Checkbox
                v-model="compressFile"
                inputId="compress"
              />
              <label for="compress" class="ml-2 text-sm">压缩文件</label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              生成ZIP压缩文件，减小文件大小
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览信息 -->
    <div class="bg-gray-50 rounded-lg p-4 mt-6">
      <h4 class="font-medium text-gray-900 mb-2">导出预览</h4>
      <div class="text-sm text-gray-600 space-y-1">
        <p>数据范围: {{ getScopeDescription() }}</p>
        <p>文件格式: {{ getFormatDescription() }}</p>
        <p>字段数量: {{ selectedFields.length }}</p>
        <p>预估大小: {{ getEstimatedSize() }}</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-3 mt-6">
      <Button
        @click="$emit('cancel')"
        label="取消"
        severity="secondary"
        outlined
      />
      <Button
        @click="handleExport"
        label="导出"
        icon="pi pi-download"
        :loading="exporting"
        :disabled="selectedFields.length === 0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FieldOption {
  value: string
  label: string
}

interface FormatOption {
  value: string
  label: string
  description: string
  icon: string
  iconColor: string
}

// Props
const props = defineProps<{
  filters: any
  selectedCount: number
}>()

// Events
const emit = defineEmits<{
  export: [format: string]
  cancel: []
}>()

// 响应式数据
const exportScope = ref<'selected' | 'filtered' | 'all'>('selected')
const selectedFormat = ref('xlsx')
const selectedFields = ref<string[]>([
  'id', 'timestamp', 'userName', 'userEmail', 'action',
  'resourceType', 'resourceId', 'result', 'riskLevel',
  'ipAddress', 'details'
])
const customFilename = ref('')
const compressFile = ref(false)
const showAdvancedOptions = ref(false)
const exporting = ref(false)

const advancedFilters = ref({
  startDate: null as Date | null,
  endDate: null as Date | null
})

// 选项数据
const formatOptions: FormatOption[] = [
  {
    value: 'xlsx',
    label: 'Excel',
    description: 'Excel表格格式',
    icon: 'pi pi-file-excel',
    iconColor: 'text-green-600'
  },
  {
    value: 'csv',
    label: 'CSV',
    description: '逗号分隔值',
    icon: 'pi pi-file',
    iconColor: 'text-blue-600'
  },
  {
    value: 'json',
    label: 'JSON',
    description: '结构化数据',
    icon: 'pi pi-code',
    iconColor: 'text-purple-600'
  }
]

const fieldOptions: FieldOption[] = [
  { value: 'id', label: 'ID' },
  { value: 'timestamp', label: '时间戳' },
  { value: 'userName', label: '用户名' },
  { value: 'userEmail', label: '用户邮箱' },
  { value: 'action', label: '操作' },
  { value: 'resourceType', label: '资源类型' },
  { value: 'resourceId', label: '资源ID' },
  { value: 'result', label: '操作结果' },
  { value: 'riskLevel', label: '风险级别' },
  { value: 'ipAddress', label: 'IP地址' },
  { value: 'details', label: '详细信息' }
]

// 计算属性
const hasActiveFilters = computed(() => {
  return props.filters && Object.keys(props.filters).some(key => {
    const value = props.filters[key]
    return value !== '' && value !== null && value !== undefined
  })
})

const allFieldsSelected = computed(() => {
  return selectedFields.value.length === fieldOptions.length
})

// 方法
const toggleAllFields = () => {
  if (allFieldsSelected.value) {
    selectedFields.value = []
  } else {
    selectedFields.value = fieldOptions.map(field => field.value)
  }
}

const getScopeDescription = () => {
  switch (exportScope.value) {
    case 'selected':
      return `选中的 ${props.selectedCount} 条记录`
    case 'filtered':
      return '符合当前筛选条件的所有记录'
    case 'all':
      return '所有审计日志记录'
    default:
      return '未知'
  }
}

const getFormatDescription = () => {
  const format = formatOptions.find(f => f.value === selectedFormat.value)
  return format ? `${format.label} (${format.description})` : '未知'
}

const getEstimatedSize = () => {
  let recordCount = 0

  switch (exportScope.value) {
    case 'selected':
      recordCount = props.selectedCount
      break
    case 'filtered':
      recordCount = 1000 // 估算值
      break
    case 'all':
      recordCount = 10000 // 估算值
      break
  }

  const fieldCount = selectedFields.value.length
  const estimatedBytes = recordCount * fieldCount * 50 // 每个字段约50字节

  if (estimatedBytes < 1024) {
    return `${estimatedBytes} B`
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

const handleExport = async () => {
  if (selectedFields.value.length === 0) {
    return
  }

  exporting.value = true

  try {
    // 构建导出参数
    const exportParams: any = {
      format: selectedFormat.value,
      fields: selectedFields.value
    }

    // 设置数据范围
    switch (exportScope.value) {
      case 'selected':
        exportParams.ids = props.filters.ids || []
        break
      case 'filtered':
        exportParams.filters = props.filters
        break
      case 'all':
        exportParams.filters = advancedFilters.value
        break
    }

    // 设置文件名
    if (customFilename.value) {
      exportParams.filename = customFilename.value
    }

    // 发送导出请求
    emit('export', selectedFormat.value)

  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.log-exporter {
  @apply space-y-4;
}

:deep(.p-radiobutton .p-radiobutton-box) {
  @apply w-4 h-4;
}

:deep(.p-checkbox .p-checkbox-box) {
  @apply w-4 h-4;
}
</style>