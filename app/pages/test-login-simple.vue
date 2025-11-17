<template>
  <div class="p-8 bg-green-50 min-h-screen">
    <h1 class="text-3xl font-bold text-green-600 mb-4">测试登录页面</h1>
    <p class="text-gray-700 mb-4">
      这是一个简化的登录页面，用于测试页面渲染是否正常。
    </p>

    <div class="bg-white p-6 rounded-lg shadow max-w-md">
      <form @submit.prevent="handleTestLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">邮箱</label>
          <input
            v-model="testForm.email"
            type="email"
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="test@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">密码</label>
          <input
            v-model="testForm.password"
            type="password"
            class="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          测试登录
        </button>
      </form>

      <div v-if="message" class="mt-4 p-3 bg-blue-100 text-blue-800 rounded">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'public'
})

const testForm = ref({
  email: '',
  password: ''
})

const message = ref('')

const handleTestLogin = () => {
  message.value = `测试登录成功！邮箱：${testForm.value.email}`
}
</script>