<template>
  <div>
    <!-- 搜索栏 -->
    <div class="search-bar mb-4">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <InputText
          v-model="searchQuery"
          placeholder="搜索员工姓名、邮箱或部门..."
          class="w-full"
          @input="searchEmployees"
        />
      </span>
    </div>

    <!-- 搜索结果 -->
    <div v-if="loading" class="text-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400 mb-2"></i>
      <p class="text-gray-500">搜索中...</p>
    </div>

    <div v-else-if="searchResults.length === 0 && searchQuery" class="text-center py-8">
      <i class="pi pi-search text-2xl text-gray-400 mb-2"></i>
      <p class="text-gray-500">未找到匹配的员工</p>
    </div>

    <div v-else-if="searchResults.length > 0" class="search-results">
      <div class="results-header flex items-center justify-between mb-3">
        <span class="text-sm text-gray-600">找到 {{ searchResults.length }} 名员工</span>
        <Button
          icon="pi pi-plus"
          label="全选"
          class="p-button-text p-button-sm"
          @click="selectAll"
        />
      </div>

      <div class="employee-list space-y-2 max-h-96 overflow-y-auto">
        <div
          v-for="employee in searchResults"
          :key="employee.id"
          class="employee-item p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
          :class="{ 'selected': selectedEmployees.has(employee.id) }"
          @click="toggleSelection(employee)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center flex-1">
              <Checkbox
                :binary="true"
                :modelValue="selectedEmployees.has(employee.id)"
                @click.stop
              />
              <div class="ml-3">
                <div class="flex items-center">
                  <h5 class="font-medium text-gray-800">{{ employee.name }}</h5>
                  <span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {{ employee.department }}
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ employee.position }}</p>
                <p class="text-xs text-gray-500">{{ employee.email }}</p>
              </div>
            </div>
            <div class="text-right">
              <p v-if="employee.phone" class="text-sm text-gray-600">{{ employee.phone }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="dialog-footer flex justify-end gap-2 mt-4">
      <Button
        label="取消"
        icon="pi pi-times"
        class="p-button-outlined"
        @click="$emit('cancel')"
      />
      <Button
        label="添加选中员工"
        icon="pi pi-check"
        :disabled="selectedEmployees.size === 0"
        @click="confirmSelection"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
interface Props {
  excludedIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  excludedIds: () => []
})

// Emits
const emit = defineEmits<{
  select: [employees: any[]]
  cancel: []
}>()

// 响应式数据
const searchQuery = ref('')
const loading = ref(false)
const selectedEmployees = ref(new Set<string>())

// 模拟员工数据
const allEmployees = [
  {
    id: 'emp001',
    name: '张三',
    email: 'zhangsan@company.com',
    phone: '13800138001',
    department: '技术部',
    position: '高级工程师'
  },
  {
    id: 'emp002',
    name: '李四',
    email: 'lisi@company.com',
    phone: '13800138002',
    department: '产品部',
    position: '产品经理'
  },
  {
    id: 'emp003',
    name: '王五',
    email: 'wangwu@company.com',
    phone: '13800138003',
    department: '市场部',
    position: '市场专员'
  }
]

const searchResults = ref<any[]>([])

// 计算属性
const availableEmployees = computed(() => {
  return allEmployees.filter(emp => !props.excludedIds.includes(emp.id))
})

// 方法
const searchEmployees = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  loading.value = true

  // 模拟搜索延迟
  setTimeout(() => {
    const query = searchQuery.value.toLowerCase()
    searchResults.value = availableEmployees.value.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query) ||
      emp.position.toLowerCase().includes(query)
    )
    loading.value = false
  }, 300)
}

const toggleSelection = (employee: any) => {
  if (selectedEmployees.value.has(employee.id)) {
    selectedEmployees.value.delete(employee.id)
  } else {
    selectedEmployees.value.add(employee.id)
  }
}

const selectAll = () => {
  searchResults.value.forEach(emp => {
    selectedEmployees.value.add(emp.id)
  })
}

const confirmSelection = () => {
  const selectedEmployeeData = searchResults.value.filter(emp =>
    selectedEmployees.value.has(emp.id)
  )
  emit('select', selectedEmployeeData)
}

// 监听搜索查询变化
watch(searchQuery, (newQuery) => {
  if (!newQuery.trim()) {
    searchResults.value = []
  }
})
</script>

<style scoped>
.employee-item {
  transition: all 0.2s ease;
}

.employee-item:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.employee-item.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}
</style>