import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,

    // 简化覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
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
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // 简化文件匹配配置
    include: [
      'test/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],

    exclude: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**'
    ],

    testTimeout: 15000,
    setupFiles: ['./test/fixtures/vitest-setup-simple.ts'],

    // 环境变量
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://test:test@localhost:3307/meeting_manage_test',
      REDIS_URL: 'redis://localhost:6379/1'
    }
  },

  // 简化Vue配置
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})
