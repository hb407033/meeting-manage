<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-blue-600">基础测试页面</h1>
    <p>当前时间: {{ currentTime }}</p>
    <p>如果你能看到这个页面，说明Nuxt正在正常工作！</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const currentTime = ref(new Date().toLocaleString())
</script>