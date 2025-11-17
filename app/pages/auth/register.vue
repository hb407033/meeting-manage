<template>
  <form @submit.prevent="handleRegister" class="space-y-6">
    <!-- 错误提示 -->
    <div v-if="lastError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <div class="flex">
        <Icon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            注册失败
          </h3>
          <div class="mt-2 text-sm text-red-700">
            {{ lastError }}
          </div>
        </div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="showSuccess" class="p-4 bg-green-50 border border-green-200 rounded-md">
      <div class="flex">
        <Icon name="i-heroicons-check-circle" class="h-5 w-5 text-green-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">
            注册成功
          </h3>
          <div class="mt-2 text-sm text-green-700">
            账户创建成功，正在为您登录...
          </div>
        </div>
      </div>
    </div>

    <!-- 姓名输入 -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        姓名
      </label>
      <div class="mt-1 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="i-heroicons-user" class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="name"
          v-model="form.name"
          name="name"
          type="text"
          autocomplete="name"
          required
          :disabled="isLoading"
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          :class="{ 'border-red-500': nameError }"
          placeholder="请输入您的姓名"
        />
      </div>
      <p v-if="nameError" class="mt-2 text-sm text-red-600">{{ nameError }}</p>
    </div>

    <!-- 邮箱输入 -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        邮箱地址
      </label>
      <div class="mt-1 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="i-heroicons-envelope" class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="email"
          v-model="form.email"
          name="email"
          type="email"
          autocomplete="email"
          required
          :disabled="isLoading"
          class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          :class="{ 'border-red-500': emailError }"
          placeholder="your@email.com"
        />
      </div>
      <p v-if="emailError" class="mt-2 text-sm text-red-600">{{ emailError }}</p>
    </div>

    <!-- 密码输入 -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        密码
      </label>
      <div class="mt-1 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="i-heroicons-lock-closed" class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="password"
          v-model="form.password"
          name="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          :disabled="isLoading"
          class="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          :class="{ 'border-red-500': passwordError }"
          placeholder="••••••••"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <Icon
              :name="showPassword ? 'i-heroicons-eye-off' : 'i-heroicons-eye'"
              class="h-5 w-5"
            />
          </button>
        </div>
      </div>
      <p v-if="passwordError" class="mt-2 text-sm text-red-600">{{ passwordError }}</p>

      <!-- 密码强度指示器 -->
      <div v-if="form.password" class="mt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">密码强度</span>
          <span
            class="text-xs font-medium"
            :class="passwordStrength.color"
          >
            {{ passwordStrength.description }}
          </span>
        </div>
        <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-300"
            :class="passwordStrength.bgColor"
            :style="{ width: passwordStrength.width }"
          />
        </div>
      </div>
    </div>

    <!-- 确认密码输入 -->
    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        确认密码
      </label>
      <div class="mt-1 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="i-heroicons-lock-closed" class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          name="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          :disabled="isLoading"
          class="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          :class="{ 'border-red-500': confirmPasswordError }"
          placeholder="••••••••"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <Icon
              :name="showConfirmPassword ? 'i-heroicons-eye-off' : 'i-heroicons-eye'"
              class="h-5 w-5"
            />
          </button>
        </div>
      </div>
      <p v-if="confirmPasswordError" class="mt-2 text-sm text-red-600">{{ confirmPasswordError }}</p>
    </div>

    <!-- 服务条款 -->
    <div class="flex items-center">
      <input
        id="agree-terms"
        v-model="agreeTerms"
        name="agree-terms"
        type="checkbox"
        required
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label for="agree-terms" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
        我同意
        <NuxtLink
          to="/terms"
          class="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          target="_blank"
        >
          服务条款
        </NuxtLink>
        和
        <NuxtLink
          to="/privacy"
          class="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          target="_blank"
        >
          隐私政策
        </NuxtLink>
      </label>
    </div>

    <!-- 注册按钮 -->
    <div>
      <button
        type="submit"
        :disabled="isLoading || !isFormValid"
        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <span class="absolute left-0 inset-y-0 flex items-center pl-3" v-if="isLoading">
          <Icon name="i-heroicons-arrow-path" class="h-5 w-5 text-blue-200 animate-spin" />
        </span>
        {{ isLoading ? '注册中...' : '创建账户' }}
      </button>
    </div>

    <!-- 登录链接 -->
    <div class="text-center">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        已有账户？
      </span>
      <NuxtLink
        to="/auth/login"
        class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        立即登录
      </NuxtLink>
    </div>
  </form>
</template>

<script setup lang="ts">
// 页面设置
definePageMeta({
  layout: 'auth',
  auth: false
})

// 认证相关
const { register, isLoading, lastError } = useAuth()
const route = useRoute()

// 密码工具
const { validatePasswordStrength, getPasswordStrengthInfo } = usePasswordStrength()

// 表单数据
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 表单状态
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreeTerms = ref(false)
const showSuccess = ref(false)
const nameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

// 密码强度
const passwordStrength = computed(() => {
  if (!form.password) {
    return {
      description: '',
      color: 'text-gray-400',
      bgColor: 'bg-gray-200',
      width: '0%'
    }
  }

  const validation = validatePasswordStrength(form.password)
  const strengthInfo = getPasswordStrengthInfo(validation.score)

  let color = 'text-red-500'
  let bgColor = 'bg-red-500'

  switch (strengthInfo.level) {
    case 'weak':
      color = 'text-red-500'
      bgColor = 'bg-red-500'
      break
    case 'fair':
      color = 'text-yellow-500'
      bgColor = 'bg-yellow-500'
      break
    case 'good':
      color = 'text-blue-500'
      bgColor = 'bg-blue-500'
      break
    case 'strong':
      color = 'text-green-500'
      bgColor = 'bg-green-500'
      break
  }

  const width = `${(validation.score / 8) * 100}%`

  return {
    description: strengthInfo.description,
    color,
    bgColor,
    width
  }
})

// 表单验证
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateForm = (): boolean => {
  let isValid = true

  // 验证姓名
  if (!form.name.trim()) {
    nameError.value = '姓名不能为空'
    isValid = false
  } else if (form.name.trim().length < 2) {
    nameError.value = '姓名至少需要2个字符'
    isValid = false
  } else {
    nameError.value = ''
  }

  // 验证邮箱
  if (!form.email.trim()) {
    emailError.value = '邮箱不能为空'
    isValid = false
  } else if (!validateEmail(form.email)) {
    emailError.value = '邮箱格式不正确'
    isValid = false
  } else {
    emailError.value = ''
  }

  // 验证密码
  if (!form.password.trim()) {
    passwordError.value = '密码不能为空'
    isValid = false
  } else if (form.password.length < 6) {
    passwordError.value = '密码至少需要6个字符'
    isValid = false
  } else {
    const validation = validatePasswordStrength(form.password)
    if (!validation.isValid) {
      passwordError.value = validation.feedback.join(', ')
      isValid = false
    } else {
      passwordError.value = ''
    }
  }

  // 验证确认密码
  if (!form.confirmPassword.trim()) {
    confirmPasswordError.value = '请确认密码'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    confirmPasswordError.value = '两次输入的密码不一致'
    isValid = false
  } else {
    confirmPasswordError.value = ''
  }

  // 验证服务条款
  if (!agreeTerms.value) {
    isValid = false
  }

  return isValid
}

// 计算属性
const isFormValid = computed(() => {
  return (
    form.name.trim() &&
    form.email.trim() &&
    form.password.trim() &&
    form.confirmPassword.trim() &&
    agreeTerms.value &&
    !nameError.value &&
    !emailError.value &&
    !passwordError.value &&
    !confirmPasswordError.value
  )
})

// 监听表单变化
watch([() => form.name, () => form.email, () => form.password, () => form.confirmPassword], () => {
  if (nameError.value && form.name.trim().length >= 2) nameError.value = ''
  if (emailError.value && validateEmail(form.email)) emailError.value = ''
  if (passwordError.value && form.password.length >= 6) {
    const validation = validatePasswordStrength(form.password)
    if (validation.isValid) passwordError.value = ''
  }
  if (confirmPasswordError.value && form.password === form.confirmPassword) {
    confirmPasswordError.value = ''
  }
})

// 处理注册
const handleRegister = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password
    })

    showSuccess.value = true

    // 3秒后重定向（注册成功会自动登录）
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  } catch (error) {
    // 错误已经在 useAuth 中处理了
    console.error('Register page error:', error)
  }
}
</script>