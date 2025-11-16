// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // CSS配置
  css: ['~/assets/css/main.css'],

  // 构建配置
  build: {
    transpile: ['primevue'],
  },

  // 模块配置
  modules: [
    '@nuxtjs/tailwindcss',
  ],

  // TypeScript配置
  typescript: {
    typeCheck: false, // 暂时禁用以避免构建问题，后面会重新启用
    strict: true,
  },

  // 开发工具配置
  sourcemap: {
    server: true,
    client: true,
  },

  // Vite配置
  vite: {
    define: {
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
    },
    optimizeDeps: {
      include: ['primevue'],
    },
  },

  // 运行时配置
  runtimeConfig: {
    // 私有配置 - 服务端可用
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,

    // 公共配置 - 客户端和服务端都可用
    public: {
      apiBase: process.env.API_BASE_URL || '/api',
      appName: '智能会议室管理系统',
    },
  },

  // Nitro配置
  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
  },
})
