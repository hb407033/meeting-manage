<template>
  <form @submit.prevent="handleSubmit">
    <!-- 基本信息 -->
    <div class="form-section">
      <h4 class="text-lg font-medium text-gray-800 mb-4">基本信息</h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field-group">
          <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
            姓名 <span class="text-red-500">*</span>
          </label>
          <InputText
            id="name"
            v-model="formData.name"
            placeholder="请输入访客姓名"
            :class="{ 'p-invalid': errors.name }"
            @blur="validateField('name')"
          />
          <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
        </div>

        <div class="field-group">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            邮箱 <span class="text-red-500">*</span>
          </label>
          <InputText
            id="email"
            v-model="formData.email"
            type="email"
            placeholder="请输入邮箱地址"
            :class="{ 'p-invalid': errors.email }"
            @blur="validateField('email')"
          />
          <small v-if="errors.email" class="text-red-500">{{ errors.email }}</small>
        </div>

        <div class="field-group">
          <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
            手机号码 <span class="text-red-500">*</span>
          </label>
          <InputText
            id="phone"
            v-model="formData.phone"
            placeholder="请输入手机号码"
            :class="{ 'p-invalid': errors.phone }"
            @blur="validateField('phone')"
          />
          <small v-if="errors.phone" class="text-red-500">{{ errors.phone }}</small>
        </div>

        <div class="field-group">
          <label for="company" class="block text-sm font-medium text-gray-700 mb-2">
            公司名称
          </label>
          <InputText
            id="company"
            v-model="formData.company"
            placeholder="请输入公司名称"
          />
        </div>
      </div>
    </div>

    <!-- 访问信息 -->
    <div class="form-section mt-6">
      <h4 class="text-lg font-medium text-gray-800 mb-4">访问信息</h4>

      <div class="field-group mb-4">
        <label for="visitPurpose" class="block text-sm font-medium text-gray-700 mb-2">
          访问目的
        </label>
        <Dropdown
          id="visitPurpose"
          v-model="formData.visitPurpose"
          :options="visitPurposeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="请选择访问目的"
        />
      </div>

      <div class="field-group">
        <label for="specialRequirements" class="block text-sm font-medium text-gray-700 mb-2">
          特殊需求
        </label>
        <Textarea
          id="specialRequirements"
          v-model="formData.specialRequirements"
          placeholder="如需特殊安排，请在此说明..."
          rows="3"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="dialog-footer flex justify-end gap-2 mt-6">
      <Button
        label="取消"
        icon="pi pi-times"
        class="p-button-outlined"
        @click="$emit('cancel')"
      />
      <Button
        label="添加访客"
        icon="pi pi-check"
        type="submit"
        :loading="isSubmitting"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// Emits
const emit = defineEmits<{
  submit: [data: any]
  cancel: []
}>()

// 响应式数据
const isSubmitting = ref(false)
const errors = reactive<Record<string, string>>({})

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  company: '',
  visitPurpose: '',
  specialRequirements: ''
})

// 访问目的选项
const visitPurposeOptions = [
  { label: '商务会议', value: 'business-meeting' },
  { label: '技术交流', value: 'technical-exchange' },
  { label: '客户拜访', value: 'client-visit' },
  { label: '培训学习', value: 'training' },
  { label: '其他', value: 'other' }
]

// 方法
const validateField = (field: string) => {
  switch (field) {
    case 'name':
      errors.name = formData.name.trim() ? '' : '请输入姓名'
      break
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      errors.email = formData.email.trim() && emailRegex.test(formData.email)
        ? ''
        : '请输入有效的邮箱地址'
      break
    case 'phone':
      const phoneRegex = /^1[3-9]\d{9}$/
      errors.phone = formData.phone.trim() && phoneRegex.test(formData.phone)
        ? ''
        : '请输入有效的手机号码'
      break
  }
}

const validateForm = () => {
  const requiredFields = ['name', 'email', 'phone']
  requiredFields.forEach(field => validateField(field))
  return Object.values(errors).every(error => !error)
}

const handleSubmit = () => {
  if (!validateForm()) return

  isSubmitting.value = true

  setTimeout(() => {
    emit('submit', { ...formData })
    isSubmitting.value = false
  }, 500)
}
</script>

<style scoped>
.form-section {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.field-group {
  margin-bottom: 1rem;
}

.field-group label {
  font-weight: 500;
}

.text-red-500 {
  color: #ef4444;
}
</style>