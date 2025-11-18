// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Nuxt 4 App目录模式 - 移除pages配置让Nuxt自动检测app/pages
  dir: {
    layouts: 'app/layouts',  // 布局文件位于 app/layouts/
    // 注意：不配置pages，让Nuxt自动发现app/pages目录
  },

  
  // CSS配置
  css: [
    '~/assets/css/main.css',
    'primeicons/primeicons.css'
  ],

  
  // 模块配置
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  // TypeScript配置
  typescript: {
    strict: true,
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

  
  // 应用配置
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },
})
