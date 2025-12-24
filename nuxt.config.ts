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
    'primeicons/primeicons.css'
  ],

  
  // 模块配置
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon',
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

    // 开发环境自动登录配置
    devAutoLoginEnabled: process.env.DEV_AUTO_LOGIN_ENABLED === 'true',
    devUserEmail: process.env.DEV_USER_EMAIL || 'dev@meeting-manage.local',
    devUserName: process.env.DEV_USER_NAME || '开发测试用户',
    devUserRole: process.env.DEV_USER_ROLE || 'ADMIN',

    // 公共配置 - 客户端和服务端都可用
    public: {
      apiBase: process.env.API_BASE_URL || '/api',
      appName: '智能会议室管理系统',
      isDevelopment: process.env.NODE_ENV === 'development',
      devAutoLoginEnabled: process.env.DEV_AUTO_LOGIN_ENABLED === 'true',
    },
  },


  // 应用配置
  // 注意：移除了 pageTransition 配置，因为缺少对应的 CSS transition 样式
  // 这会导致页面内容叠加问题。如果需要页面切换动画，需要在 main.css 中添加对应的样式
  app: {
    // pageTransition: { name: 'page', mode: 'out-in' },  // 已禁用
  },

  })
