<template>
  <div class="notification-settings">
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-bell"></i>
          <span>通知设置</span>
        </div>
      </template>

      <template #content>
        <div class="space-y-6">
          <!-- 基本通知偏好 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">基本通知偏好</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center">
                <Checkbox
                  v-model="preferences.emailEnabled"
                  inputId="emailEnabled"
                  :binary="true"
                />
                <label for="emailEnabled" class="ml-2">启用邮件通知</label>
              </div>
              <div class="flex items-center">
                <Checkbox
                  v-model="preferences.systemEnabled"
                  inputId="systemEnabled"
                  :binary="true"
                />
                <label for="systemEnabled" class="ml-2">启用系统内通知</label>
              </div>
            </div>
          </div>

          <!-- 提醒设置 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">提醒设置</h3>
            <div class="space-y-4">
              <div>
                <label for="reminderMinutes" class="block text-sm font-medium mb-2">
                  默认提前提醒时间
                </label>
                <div class="flex items-center gap-2">
                  <InputNumber
                    id="reminderMinutes"
                    v-model="preferences.reminderMinutes"
                    :min="1"
                    :max="1440"
                    showButtons
                    class="w-32"
                  />
                  <span>分钟</span>
                </div>
              </div>

              <div>
                <label for="maxRemindersPerDay" class="block text-sm font-medium mb-2">
                  每日最大提醒数
                </label>
                <InputNumber
                  id="maxRemindersPerDay"
                  v-model="reminderSettings.maxRemindersPerDay"
                  :min="1"
                  :max="100"
                  showButtons
                  class="w-32"
                />
              </div>
            </div>
          </div>

          <!-- 免打扰设置 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">免打扰设置</h3>
            <div class="space-y-4">
              <div class="flex items-center">
                <Checkbox
                  v-model="preferences.quietHoursEnabled"
                  inputId="quietHoursEnabled"
                  :binary="true"
                />
                <label for="quietHoursEnabled" class="ml-2">启用免打扰时间</label>
              </div>

              <div v-if="preferences.quietHoursEnabled" class="grid grid-cols-2 gap-4">
                <div>
                  <label for="quietHoursStart" class="block text-sm font-medium mb-2">
                    开始时间
                  </label>
                  <InputText
                    id="quietHoursStart"
                    v-model="preferences.quietHoursStart"
                    type="time"
                    class="w-full"
                  />
                </div>
                <div>
                  <label for="quietHoursEnd" class="block text-sm font-medium mb-2">
                    结束时间
                  </label>
                  <InputText
                    id="quietHoursEnd"
                    v-model="preferences.quietHoursEnd"
                    type="time"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 高级设置 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">高级设置</h3>
            <div class="space-y-4">
              <div class="flex items-center">
                <Checkbox
                  v-model="reminderSettings.workingDaysOnly"
                  inputId="workingDaysOnly"
                  :binary="true"
                />
                <label for="workingDaysOnly" class="ml-2">仅工作日提醒</label>
              </div>

              <div class="flex items-center">
                <Checkbox
                  v-model="reminderSettings.skipWeekends"
                  inputId="skipWeekends"
                  :binary="true"
                />
                <label for="skipWeekends" class="ml-2">跳过周末提醒</label>
              </div>

              <div>
                <label for="holidayHandling" class="block text-sm font-medium mb-2">
                  节假日处理方式
                </label>
                <Dropdown
                  id="holidayHandling"
                  v-model="reminderSettings.holidayHandling"
                  :options="holidayHandlingOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full md:w-48"
                />
              </div>

              <div class="flex items-center">
                <Checkbox
                  v-model="reminderSettings.batchReminders"
                  inputId="batchReminders"
                  :binary="true"
                />
                <label for="batchReminders" class="ml-2">批量提醒</label>
              </div>

              <div v-if="reminderSettings.batchReminders">
                <label for="batchDelayMinutes" class="block text-sm font-medium mb-2">
                  批量延迟时间
                </label>
                <div class="flex items-center gap-2">
                  <InputNumber
                    id="batchDelayMinutes"
                    v-model="reminderSettings.batchDelayMinutes"
                    :min="1"
                    :max="60"
                    showButtons
                    class="w-32"
                  />
                  <span>分钟</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <Button
              label="重置"
              severity="secondary"
              @click="resetToDefaults"
              :loading="loading"
            />
            <Button
              label="保存设置"
              @click="saveSettings"
              :loading="loading"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

// Toast
const toast = useToast()

// 响应式数据
const loading = ref(false)

const preferences = ref({
  emailEnabled: true,
  systemEnabled: true,
  reminderMinutes: 15,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'Asia/Shanghai',
  preferredChannels: {},
  categoryPreferences: {}
})

const reminderSettings = ref({
  defaultReminderMinutes: 15,
  enabledTypes: ['RECURRING_REMINDER', 'RESERVATION_REMINDER'],
  customReminders: [],
  workingDaysOnly: false,
  skipWeekends: false,
  holidayHandling: 'SKIP',
  maxRemindersPerDay: 10,
  batchReminders: true,
  batchDelayMinutes: 5
})

const holidayHandlingOptions = [
  { label: '跳过节假日', value: 'SKIP' },
  { label: '节假日前提醒', value: 'BEFORE' },
  { label: '节假日后提醒', value: 'AFTER' },
  { label: '正常提醒', value: 'NORMAL' }
]

// 方法
const loadSettings = async () => {
  try {
    loading.value = true
    const response = await $fetch('/api/v1/notifications/preferences')

    if (response.success && response.data) {
      if (response.data.notificationPreference) {
        preferences.value = { ...preferences.value, ...response.data.notificationPreference }
      }
      if (response.data.reminderSettings) {
        reminderSettings.value = { ...reminderSettings.value, ...response.data.reminderSettings }
      }
    }
  } catch (error) {
    console.error('Failed to load notification preferences:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载通知设置',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  try {
    loading.value = true

    const settings = {
      ...preferences.value,
      ...reminderSettings.value
    }

    const response = await $fetch('/api/v1/notifications/preferences', {
      method: 'PUT',
      body: settings
    })

    if (response.success) {
      toast.add({
        severity: 'success',
        summary: '保存成功',
        detail: '通知设置已更新',
        life: 3000
      })
    } else {
      throw new Error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('Failed to save notification preferences:', error)
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: error.message || '无法保存通知设置',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const resetToDefaults = () => {
  preferences.value = {
    emailEnabled: true,
    systemEnabled: true,
    reminderMinutes: 15,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'Asia/Shanghai',
    preferredChannels: {},
    categoryPreferences: {}
  }

  reminderSettings.value = {
    defaultReminderMinutes: 15,
    enabledTypes: ['RECURRING_REMINDER', 'RESERVATION_REMINDER'],
    customReminders: [],
    workingDaysOnly: false,
    skipWeekends: false,
    holidayHandling: 'SKIP',
    maxRemindersPerDay: 10,
    batchReminders: true,
    batchDelayMinutes: 5
  }

  toast.add({
    severity: 'info',
    summary: '已重置',
    detail: '通知设置已恢复为默认值',
    life: 3000
  })
}

// 生命周期
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.notification-settings {
  max-width: 800px;
  margin: 0 auto;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .md\:w-48 {
    width: 12rem;
  }
}

.w-full {
  width: 100%;
}

.w-32 {
  width: 8rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-end {
  justify-content: flex-end;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.block {
  display: block;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.pt-4 {
  padding-top: 1rem;
}

.border-t {
  border-top-width: 1px;
  border-color: rgb(229 231 235);
}
</style>