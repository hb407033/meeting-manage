import { config } from '@vue/test-utils'
import { afterEach, beforeEach, vi } from 'vitest'

// Mock Nuxt composables
config.global.mocks = {
  $route: vi.fn(),
  $router: vi.fn(),
  useNuxtApp: vi.fn(() => ({
    $route: {},
    $router: {},
    $fetch: vi.fn(),
  })),
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBase: '/api',
      appName: '智能会议室管理系统',
    },
    databaseUrl: 'mock-database-url',
    redisUrl: 'mock-redis-url',
    jwtSecret: 'mock-jwt-secret',
  })),
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
}

// Mock window APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})
