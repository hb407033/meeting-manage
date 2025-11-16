import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { URL, fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 测试环境配置
    environment: 'jsdom',

    // 全局配置
    globals: true,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '.nuxt/**',
        '.output/**',
        'coverage/**',
        'dist/**',
        'test/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/prisma/migrations/**',
        '**/prisma/seed-*.ts',
        'nuxt.config.ts',
        'tailwind.config.js'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        // 核心服务文件要求更高覆盖率
        './server/services/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      all: true,
      clean: true,
      cleanOnRerun: true
    },

    // 测试文件匹配模式
    include: [
      'test/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}',
      '**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],

    // 排除文件
    exclude: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'test/**/fixtures/**',
      'test/**/helpers/**',
      'tests/**/fixtures/**',
      'tests/**/helpers/**'
    ],

    // 测试超时设置
    testTimeout: 15000,
    hookTimeout: 15000,

    // 并发配置
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },

    // 监听模式配置
    watch: false,

    // 静默输出
    silent: false,
    verbose: true,

    // 报告器配置
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/test-report.html'
    },

    // 测试设置文件
    setupFiles: ['./test/fixtures/vitest-setup.ts'],

    // 环境变量
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://test:test@localhost:3307/meeting_manage_test',
      REDIS_URL: 'redis://localhost:6379/1'
    }
  },

  // 解析配置
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@@': fileURLToPath(new URL('./', import.meta.url)),
      '#app': fileURLToPath(new URL('./app', import.meta.url)),
      '#components': fileURLToPath(new URL('./components', import.meta.url)),
      '#pages': fileURLToPath(new URL('./pages', import.meta.url)),
      '#layouts': fileURLToPath(new URL('./layouts', import.meta.url)),
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
      '#utils': fileURLToPath(new URL('./utils', import.meta.url)),
      '#stores': fileURLToPath(new URL('./stores', import.meta.url)),
      '#types': fileURLToPath(new URL('./types', import.meta.url)),
      '#assets': fileURLToPath(new URL('./assets', import.meta.url)),
      '#middleware': fileURLToPath(new URL('./middleware', import.meta.url)),
      '#plugins': fileURLToPath(new URL('./plugins', import.meta.url)),
      '#composables': fileURLToPath(new URL('./composables', import.meta.url)),
      '#test': fileURLToPath(new URL('./test', import.meta.url))
    }
  },

  // 定义全局变量
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})
