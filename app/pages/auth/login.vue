<template>
  <form @submit.prevent="handleLogin" class="space-y-6">
    <!-- 错误提示 -->
    <div v-if="lastError" class="p-4 bg-red-50 border border-red-200 rounded-md">
      <div class="flex">
        <i class="pi pi-exclamation-triangle text-red-400"></i>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            登录失败
          </h3>
          <div class="mt-2 text-sm text-red-700">
            {{ lastError }}
          </div>
        </div>
      </div>
    </div>

    <!-- 邮箱输入 -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        邮箱地址
      </label>
      <div class="mt-1 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i class="pi pi-envelope text-gray-400"></i>
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
          <i class="pi pi-lock text-gray-400"></i>
        </div>
        <input
          id="password"
          v-model="form.password"
          name="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
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
            <i
              :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
              class="text-gray-400"
            ></i>
          </button>
        </div>
      </div>
      <p v-if="passwordError" class="mt-2 text-sm text-red-600">{{ passwordError }}</p>
    </div>

    <!-- 记住我和忘记密码 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <input
          id="remember-me"
          v-model="rememberMe"
          name="remember-me"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="remember-me" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
          记住我
        </label>
      </div>

      <div class="text-sm">
        <NuxtLink
          to="/auth/forgot-password"
          class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          忘记密码？
        </NuxtLink>
      </div>
    </div>

    <!-- 登录按钮 -->
    <div>
      <button
        type="submit"
        :disabled="isLoading || !isFormValid"
        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        <span class="absolute left-0 inset-y-0 flex items-center pl-3" v-if="isLoading">
          <i class="pi pi-spin pi-spinner text-blue-200"></i>
        </span>
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
    </div>

    <!-- 注册链接 -->
    <div class="text-center">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        还没有账户？
      </span>
      <NuxtLink
        to="/auth/register"
        class="ml-1 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
      >
        立即注册
      </NuxtLink>
    </div>
  </form>
</template>

<script setup lang="ts">
// Vue导入
import { reactive, ref, computed, watch, onMounted } from 'vue'

// 页面设置
definePageMeta({
  layout: 'auth',
  auth: false
})

// 认证相关
const { login, isLoading, lastError } = useAuth()
const route = useRoute()

// 表单数据
const form = reactive({
  email: 'houbin@123.com',
  password: ''
})

// 表单状态
const showPassword = ref(false)
const rememberMe = ref(false)
const emailError = ref('')
const passwordError = ref('')

// 表单验证
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateForm = (): boolean => {
  let isValid = true

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
    passwordError.value = ''
  }

  return isValid
}

// 计算属性
const isFormValid = computed(() => {
  return form.email.trim() && form.password.trim() && !emailError.value && !passwordError.value
})

// 监听表单变化
watch([() => form.email, () => form.password], () => {
  if (emailError.value) emailError.value = ''
  if (passwordError.value) passwordError.value = ''
})

// 处理登录
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await login({
      email: form.email.trim(),
      password: form.password
    })

    // 如果启用了记住我，可以在本地存储更多信息
    if (rememberMe.value) {
      // 这里可以存储用户的偏好设置
      localStorage.setItem('auth_remember_email', form.email.trim())
    } else {
      localStorage.removeItem('auth_remember_email')
    }
  } catch (error) {
    // 错误已经在 useAuth 中处理了
    console.error('Login page error:', error)
  }
}

// 页面初始化
onMounted(() => {
  // 如果之前记住了邮箱，自动填充
  const savedEmail = localStorage.getItem('auth_remember_email')
  if (savedEmail) {
    form.email = savedEmail
    rememberMe.value = true
  }
})
</script>