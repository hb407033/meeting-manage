<template>
  <div class="role-selector">
    <Dropdown
      v-model="selectedRoles"
      :options="availableRoles"
      optionLabel="label"
      optionValue="value"
      :placeholder="placeholder"
      :multiple="multiple"
      :filter="true"
      :disabled="disabled"
      :showClear="showClear"
      class="role-selector-dropdown"
      @change="handleChange"
    >
      <template #option="{ option }">
        <div class="role-option">
          <div class="role-option-info">
            <span class="role-option-name">{{ option.name }}</span>
            <Tag
              v-if="option.isSystem"
              value="系统"
              severity="warning"
              size="small"
            />
          </div>
          <div class="role-option-meta">
            <span class="role-option-code">{{ option.code }}</span>
            <Badge
              :value="option.level"
              severity="info"
              size="small"
            />
          </div>
        </div>
      </template>

      <template #value="{ value, placeholder }">
        <div v-if="Array.isArray(value) && value.length > 0" class="role-selector-value">
          <div class="selected-roles">
            <Chip
              v-for="role in value"
              :key="role.id"
              :label="role.name"
              :removable="!disabled"
              @remove="removeRole(role)"
              class="role-chip"
            />
            <span v-if="value.length > maxVisible" class="role-chip-more">
              +{{ value.length - maxVisible }}
            </span>
          </div>
        </div>
        <span v-else class="role-selector-placeholder">
          {{ placeholder }}
        </span>
      </template>
    </Dropdown>

    <!-- 选中的角色信息展示 -->
    <div v-if="showSelectedInfo && selectedRoles.length > 0" class="selected-roles-info">
      <div class="info-section">
        <h4 class="info-title">已选择角色</h4>
        <div class="selected-roles-list">
          <div
            v-for="role in selectedRoles"
            :key="role.id"
            class="selected-role-item"
          >
            <div class="role-info">
              <div class="role-name">{{ role.name }}</div>
              <div class="role-meta">
                <span class="role-code">{{ role.code }}</span>
                <Badge :value="role.level" severity="info" size="small" />
                <Badge
                  v-if="role.permissionCount"
                  :value="role.permissionCount"
                  severity="secondary"
                  size="small"
                />
              </div>
            </div>
            <Button
              v-if="!disabled"
              icon="pi pi-times"
              size="small"
              text
              rounded
              severity="danger"
              @click="removeRole(role)"
              v-tooltip="'移除角色'"
            />
          </div>
        </div>
      </div>

      <!-- 角色权限统计 -->
      <div class="info-section">
        <h4 class="info-title">权限统计</h4>
        <div class="permission-stats">
          <div class="stat-item">
            <span class="stat-label">总权限数:</span>
            <span class="stat-value">{{ totalPermissions }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最高权限:</span>
            <span class="stat-value">{{ highestPermissionLevel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props定义
interface Props {
  modelValue: string[] | string
  options?: RoleOption[]
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
  showClear?: boolean
  showSelectedInfo?: boolean
  maxVisible?: number
}

interface RoleOption {
  id: string
  name: string
  code: string
  level: number
  isSystem: boolean
  permissionCount?: number
  permissions?: Array<{
    id: string
    name: string
    code: string
    resource: string
    action: string
    module: string
  }>
}

// Props默认值
const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择角色',
  multiple: true,
  disabled: false,
  showClear: true,
  showSelectedInfo: false,
  maxVisible: 3
})

// Emits定义
const emit = defineEmits<{
  'update:modelValue': [value: string[] | string]
  'change': [value: string[] | string, roles: RoleOption[]]
}>()

// 响应式数据
const selectedRoles = ref<any>(props.modelValue || [])
const availableRoles = ref<RoleOption[]>([])

// 计算属性
const totalPermissions = computed(() => {
  if (!Array.isArray(selectedRoles.value)) return 0

  const permissionSet = new Set<string>()
  selectedRoles.value.forEach((role: RoleOption) => {
    role.permissions?.forEach((permission) => {
      permissionSet.add(permission.code)
    })
  })

  return permissionSet.size
})

const highestPermissionLevel = computed(() => {
  if (!Array.isArray(selectedRoles.value)) return 0

  return Math.max(...selectedRoles.value.map((role: RoleOption) => role.level), 0)
})

// 方法
const handleChange = (value: any) => {
  selectedRoles.value = value

  // 触发更新事件
  emit('update:modelValue', value)

  // 触发变化事件
  const selectedRoleObjects = Array.isArray(value)
    ? value.map((id: string) => availableRoles.value.find(r => r.id === id)).filter(Boolean)
    : []
  emit('change', value, selectedRoleObjects)
}

const removeRole = (roleToRemove: RoleOption) => {
  let newValue: string[] | string

  if (Array.isArray(selectedRoles.value)) {
    newValue = selectedRoles.value.filter((role: any) => role.id !== roleToRemove.id)
  } else {
    // 单选模式下，清空选择
    newValue = ''
  }

  selectedRoles.value = newValue
  emit('update:modelValue', newValue)
  emit('change', newValue, [])
}

// 加载可用角色
const loadAvailableRoles = async () => {
  try {
    const { data } = await $fetch('/api/v1/admin/roles')
    availableRoles.value = data.map((role: any) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      level: role.level,
      isSystem: role.isSystem,
      permissionCount: role.permissionCount,
      permissions: role.permissions?.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        resource: rp.permission.resource,
        action: rp.permission.action,
        module: rp.permission.module
      })) || []
    }))
  } catch (error) {
    console.error('加载角色数据失败:', error)
  }
}

// Watch external changes
watch(() => props.modelValue, (newValue) => {
  selectedRoles.value = newValue || []
}, { immediate: true })

// 初始化
onMounted(() => {
  if (props.options && props.options.length > 0) {
    availableRoles.value = props.options
  } else {
    loadAvailableRoles()
  }
})
</script>

<style scoped>
.role-selector {
  width: 100%;
}

.role-selector-dropdown {
  width: 100%;
}

/* 下拉选项样式 */
.role-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  width: 100%;
}

.role-option-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.role-option-name {
  font-weight: 500;
  color: #111827;
}

.role-option-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-option-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* 选中值样式 */
.role-selector-value {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.selected-roles {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 100%;
}

.role-chip {
  margin: 0;
  font-size: 0.875rem;
}

.role-chip-more {
  font-size: 0.875rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.role-selector-placeholder {
  color: #9ca3af;
}

/* 已选择角色信息 */
.selected-roles-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.info-section {
  margin-bottom: 1.5rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.selected-roles-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.role-info {
  flex: 1;
}

.role-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-code {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

/* 权限统计 */
.permission-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-weight: 500;
  color: #374151;
}

.stat-value {
  font-weight: 600;
  color: #1e40af;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .role-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .selected-role-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .permission-stats {
    .stat-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
}
</style>