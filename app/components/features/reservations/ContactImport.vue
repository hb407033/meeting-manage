<template>
  <div>
    <div class="text-center mb-6">
      <i class="pi pi-download text-4xl text-blue-600 mb-3"></i>
      <h4 class="text-lg font-medium text-gray-800 mb-2">从通讯录导入</h4>
      <p class="text-sm text-gray-600">选择常用联系人添加到会议中</p>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar mb-4">
      <span class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <InputText
          v-model="searchQuery"
          placeholder="搜索联系人..."
          class="w-full"
        />
      </span>
    </div>

    <!-- 联系人分组 -->
    <div class="contact-groups">
      <!-- 频繁联系人 -->
      <div v-if="filteredFrequentContacts.length > 0" class="contact-group mb-6">
        <div class="group-header flex items-center mb-3">
          <i class="pi pi-star text-yellow-500 mr-2"></i>
          <h5 class="font-medium text-gray-800">频繁联系人</h5>
        </div>
        <div class="contact-list space-y-2">
          <div
            v-for="contact in filteredFrequentContacts"
            :key="contact.id"
            class="contact-item flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            @click="toggleSelection(contact)"
          >
            <div class="flex items-center">
              <Checkbox
                :binary="true"
                :modelValue="selectedContacts.has(contact.id)"
              />
              <div class="ml-3">
                <div class="flex items-center">
                  <span class="font-medium text-gray-800">{{ contact.name }}</span>
                  <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {{ contact.company || contact.department }}
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ contact.email }}</p>
              </div>
            </div>
            <Button
              icon="pi pi-plus"
              size="small"
              class="p-button-text p-button-rounded"
              @click.stop="addContact(contact)"
            />
          </div>
        </div>
      </div>

      <!-- 部门联系人 -->
      <div v-if="filteredDepartmentContacts.length > 0" class="contact-group mb-6">
        <div class="group-header flex items-center mb-3">
          <i class="pi pi-building text-green-600 mr-2"></i>
          <h5 class="font-medium text-gray-800">部门联系人</h5>
        </div>
        <div class="contact-list space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="contact in filteredDepartmentContacts"
            :key="contact.id"
            class="contact-item flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            @click="toggleSelection(contact)"
          >
            <div class="flex items-center">
              <Checkbox
                :binary="true"
                :modelValue="selectedContacts.has(contact.id)"
              />
              <div class="ml-3">
                <div class="flex items-center">
                  <span class="font-medium text-gray-800">{{ contact.name }}</span>
                  <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {{ contact.position }}
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ contact.email }}</p>
              </div>
            </div>
            <Button
              icon="pi pi-plus"
              size="small"
              class="p-button-text p-button-rounded"
              @click.stop="addContact(contact)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 无联系人状态 -->
    <div v-if="filteredContacts.length === 0" class="empty-state text-center py-8">
      <i class="pi pi-address-book text-4xl text-gray-400 mb-3"></i>
      <p class="text-gray-500">没有找到匹配的联系人</p>
    </div>

    <!-- 操作按钮 -->
    <div class="dialog-footer flex justify-between items-center mt-6">
      <div class="text-sm text-gray-600">
        已选择 {{ selectedContacts.size }} 位联系人
      </div>
      <div class="flex gap-2">
        <Button
          label="取消"
          icon="pi pi-times"
          class="p-button-outlined"
          @click="$emit('cancel')"
        />
        <Button
          label="导入选中联系人"
          icon="pi pi-check"
          :disabled="selectedContacts.size === 0"
          @click="confirmImport"
        />
      </div>
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
  import: [contacts: any[]]
  cancel: []
}>()

// 响应式数据
const searchQuery = ref('')
const selectedContacts = ref(new Set<string>())

// 模拟联系人数据
const frequentContacts = [
  {
    id: 'freq001',
    name: '陈总',
    email: 'chen@partner-company.com',
    phone: '13900139001',
    company: '合作公司A',
    frequency: 'high'
  },
  {
    id: 'freq002',
    name: '李经理',
    email: 'li@client-company.com',
    phone: '13900139002',
    company: '客户公司B',
    frequency: 'high'
  }
]

const departmentContacts = [
  {
    id: 'dept001',
    name: '技术总监',
    email: 'cto@company.com',
    phone: '13900139003',
    department: '技术部',
    position: '技术总监'
  },
  {
    id: 'dept002',
    name: '产品经理',
    email: 'pm@company.com',
    phone: '13900139004',
    department: '产品部',
    position: '产品经理'
  }
]

const allContacts = [...frequentContacts, ...departmentContacts]

// 计算属性
const availableContacts = computed(() => {
  return allContacts.filter(contact => !props.excludedIds.includes(contact.id))
})

const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableContacts.value
  }

  const query = searchQuery.value.toLowerCase()
  return availableContacts.value.filter(contact =>
    contact.name.toLowerCase().includes(query) ||
    contact.email.toLowerCase().includes(query) ||
    (contact.company && contact.company.toLowerCase().includes(query)) ||
    (contact.department && contact.department.toLowerCase().includes(query))
  )
})

const filteredFrequentContacts = computed(() => {
  return filteredContacts.value.filter(contact => contact.frequency === 'high')
})

const filteredDepartmentContacts = computed(() => {
  return filteredContacts.value.filter(contact => contact.department)
})

// 方法
const toggleSelection = (contact: any) => {
  if (selectedContacts.value.has(contact.id)) {
    selectedContacts.value.delete(contact.id)
  } else {
    selectedContacts.value.add(contact.id)
  }
}

const addContact = (contact: any) => {
  selectedContacts.value.add(contact.id)
}

const confirmImport = () => {
  const selectedContactData = allContacts.filter(contact =>
    selectedContacts.value.has(contact.id)
  )
  emit('import', selectedContactData)
}
</script>

<style scoped>
.contact-item {
  transition: all 0.2s ease;
}

.contact-item:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.group-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.contact-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
}
</style>