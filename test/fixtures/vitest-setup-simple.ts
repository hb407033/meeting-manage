import 'jsdom-global'
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, watch, nextTick, onMounted, onUnmounted, reactive, toRef, toRefs } from 'vue'

// Stub Vue globals
globalThis.ref = ref
globalThis.computed = computed
globalThis.watch = watch
globalThis.nextTick = nextTick
globalThis.onMounted = onMounted
globalThis.onUnmounted = onUnmounted
globalThis.reactive = reactive
globalThis.toRef = toRef
globalThis.toRefs = toRefs


// 全局测试工具
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): T
      toHaveClass(className: string): T
      toBeVisible(): T
    }
  }
}

// 扩展expect匹配器
import { expect } from 'vitest'
import { within } from '@testing-library/dom'

// 自定义匹配器
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && document.body.contains(received)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass
    }
  },

  toHaveClass(received, className) {
    const pass = received && received.classList.contains(className)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass
    }
  },

  toBeVisible(received) {
    const pass = received &&
      received.style.display !== 'none' &&
      received.style.visibility !== 'hidden' &&
      !received.hidden
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be visible`,
      pass
    }
  }
})

beforeAll(async () => {
  console.log('Simple test environment setup completed')
})

afterAll(async () => {
  console.log('Simple test environment cleaned up')
})

beforeEach(async () => {
  // 每个测试前的清理工作
})

afterEach(async () => {
  // 每个测试后的清理工作
})

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in tests:', error)
  process.exit(1)
})