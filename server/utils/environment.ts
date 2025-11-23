/**
 * 环境检测工具函数
 * 用于识别当前运行环境是否为开发环境
 */

/**
 * 检测当前是否为开发环境
 * @returns {boolean} 如果是开发环境返回true，否则返回false
 */
export function isDevelopmentEnvironment(): boolean {
  // 检查NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // 检查Nuxt运行时配置（如果可用）
  try {
    const config = useRuntimeConfig()
    if (config.public?.isDevelopment) {
      return true
    }
  } catch {
    // useRuntimeConfig不可用，继续其他检查
  }

  // 检查其他开发环境指标
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.DEV_AUTO_LOGIN_ENABLED === 'true' ||
    import.meta.dev ||
    import.meta.server
  )
}

/**
 * 检查开发自动登录是否启用
 * @returns {boolean} 如果启用返回true，否则返回false
 */
export function isDevAutoLoginEnabled(): boolean {
  try {
    const config = useRuntimeConfig()

    // 仅在开发环境下启用
    if (!isDevelopmentEnvironment()) {
      return false
    }

    return config.devAutoLoginEnabled === true || config.public?.devAutoLoginEnabled === true
  } catch {
    // useRuntimeConfig不可用时，检查环境变量
    return isDevelopmentEnvironment() && process.env.DEV_AUTO_LOGIN_ENABLED === 'true'
  }
}

/**
 * 获取开发用户配置
 * @returns {Object} 开发用户配置信息
 */
export function getDevUserConfig() {
  try {
    const config = useRuntimeConfig()

    return {
      email: config.devUserEmail || 'dev@meeting-manage.local',
      name: config.devUserName || '开发测试用户',
      role: config.devUserRole || 'ADMIN'
    }
  } catch {
    // useRuntimeConfig不可用时，使用环境变量或默认值
    return {
      email: process.env.DEV_USER_EMAIL || 'dev@meeting-manage.local',
      name: process.env.DEV_USER_NAME || '开发测试用户',
      role: process.env.DEV_USER_ROLE || 'ADMIN'
    }
  }
}

/**
 * 安全检查：确保自动登录功能仅在开发环境生效
 * @returns {boolean} 如果安全检查通过返回true，否则返回false
 */
export function isDevAutoLoginSafe(): boolean {
  try {
    // 尝试导入安全检查模块
    const devLoginSecurity = require('./dev-login-security')
    const { performSecurityCheck } = devLoginSecurity
    const result = performSecurityCheck()
    return result.safe
  } catch (error) {
    // 检查是否是测试环境或模块不存在
    if (error.code === 'MODULE_NOT_FOUND' || process.env.NODE_ENV === 'test') {
      // 在测试环境中直接使用基础检查
      return performBasicSecurityCheck()
    }

    console.warn('安全检查模块加载失败，使用基础检查:', error)

    // 降级到基础安全检查
    return performBasicSecurityCheck()
  }
}

/**
 * 基础安全检查（降级方案）
 */
function performBasicSecurityCheck(): boolean {
  // 确保不在生产环境
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // 确保不是生产环境配置
  if (process.env.DATABASE_URL?.includes('prod') ||
      process.env.REDIS_URL?.includes('prod')) {
    return false
  }

  // 确保域名不是生产域名
  const host = process.env.HOST || process.env.BASE_URL || ''
  if (host.includes('meeting-manage.com') || host.includes('company.com')) {
    return false
  }

  return true
}