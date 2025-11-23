/**
 * 开发环境自动登录安全检查模块
 * 提供多层安全检查，确保自动登录功能仅在开发环境生效
 */

import { isDevelopmentEnvironment } from './environment'

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  safe: boolean
  reason?: string
  recommendations?: string[]
}

/**
 * 执行完整的安全检查
 * @returns {SecurityCheckResult} 安全检查结果
 */
export function performSecurityCheck(): SecurityCheckResult {
  const checks = [
    checkEnvironmentVariables(),
    checkDatabaseConnection(),
    checkHostnameAndDomain(),
    checkProductionIndicators(),
    checkFileSystemSafety()
  ]

  const failures = checks.filter(check => !check.safe)

  if (failures.length === 0) {
    return { safe: true }
  }

  return {
    safe: false,
    reason: failures.map(f => f.reason).join('; '),
    recommendations: [
      '请确保仅在开发环境下使用自动登录功能',
      '检查环境变量配置',
      '确认数据库连接是开发环境',
      '验证域名和主机名配置',
      ...failures.flatMap(f => f.recommendations || [])
    ]
  }
}

/**
 * 检查环境变量
 */
function checkEnvironmentVariables(): SecurityCheckResult {
  const env = process.env

  // 检查NODE_ENV
  if (env.NODE_ENV === 'production') {
    return {
      safe: false,
      reason: 'NODE_ENV为production',
      recommendations: ['设置NODE_ENV=development']
    }
  }

  // 检查自动登录开关
  if (env.DEV_AUTO_LOGIN_ENABLED !== 'true') {
    return {
      safe: false,
      reason: 'DEV_AUTO_LOGIN_ENABLED未设置为true',
      recommendations: ['设置DEV_AUTO_LOGIN_ENABLED=true']
    }
  }

  // 检查是否有生产环境配置
  const prodIndicators = [
    'DATABASE_URL',
    'REDIS_URL',
    'API_BASE_URL',
    'HOST',
    'BASE_URL'
  ]

  for (const indicator of prodIndicators) {
    const value = env[indicator]
    if (value && (
      value.includes('prod') ||
      value.includes('production') ||
      value.includes('meeting-manage.com') ||
      value.includes('company.com')
    )) {
      return {
        safe: false,
        reason: `环境变量${indicator}包含生产环境标识`,
        recommendations: [`确保${indicator}指向开发环境`]
      }
    }
  }

  return { safe: true }
}

/**
 * 检查数据库连接安全性
 */
function checkDatabaseConnection(): SecurityCheckResult {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    return {
      safe: false,
      reason: '未配置DATABASE_URL',
      recommendations: ['配置开发环境数据库连接']
    }
  }

  // 检查是否包含生产环境标识
  const prodPatterns = [
    'prod',
    'production',
    'meeting-manage.com',
    'company.com',
    'live',
    'official'
  ]

  for (const pattern of prodPatterns) {
    if (databaseUrl.toLowerCase().includes(pattern)) {
      return {
        safe: false,
        reason: `数据库URL包含生产环境标识: ${pattern}`,
        recommendations: ['使用开发环境数据库']
      }
    }
  }

  // 检查主机名
  const hostnamePatterns = [
    'localhost',
    '127.0.0.1',
    'dev-',
    'test-',
    'staging-'
  ]

  const isDevHost = hostnamePatterns.some(pattern =>
    databaseUrl.toLowerCase().includes(pattern)
  )

  if (!isDevHost) {
    return {
      safe: false,
      reason: '数据库主机不是开发环境主机',
      recommendations: ['使用localhost或开发环境专用数据库']
    }
  }

  return { safe: true }
}

/**
 * 检查主机名和域名
 */
function checkHostnameAndDomain(): SecurityCheckResult {
  const host = process.env.HOST || process.env.BASE_URL || ''
  const port = process.env.PORT || '3000'

  // 检查是否为生产域名
  const prodDomains = [
    'meeting-manage.com',
    'company.com',
    'app.meeting-manage.com',
    'api.meeting-manage.com'
  ]

  for (const domain of prodDomains) {
    if (host.includes(domain)) {
      return {
        safe: false,
        reason: `主机包含生产域名: ${domain}`,
        recommendations: ['使用localhost或开发域名']
      }
    }
  }

  // 检查端口（生产环境通常使用80/443）
  if (['80', '443'].includes(port) && !host.includes('localhost')) {
    return {
      safe: false,
      reason: '使用了生产环境端口',
      recommendations: ['使用开发端口（如3000）']
    }
  }

  return { safe: true }
}

/**
 * 检查生产环境指标
 */
function checkProductionIndicators(): SecurityCheckResult {
  const indicators = [
    { env: 'DEPLOY_ENV', prodValues: ['production', 'prod', 'live'] },
    { env: 'ENVIRONMENT', prodValues: ['production', 'prod', 'live'] },
    { env: 'APP_ENV', prodValues: ['production', 'prod', 'live'] },
    { env: 'RAILS_ENV', prodValues: ['production'] },
    { env: 'FLASK_ENV', prodValues: ['production'] },
    { env: 'DJANGO_SETTINGS_MODULE', prodValues: ['production'] }
  ]

  for (const indicator of indicators) {
    const value = process.env[indicator.env]
    if (value && indicator.prodValues.includes(value.toLowerCase())) {
      return {
        safe: false,
        reason: `${indicator.env}设置为生产环境`,
        recommendations: [`设置${indicator.env}=development或删除该变量`]
      }
    }
  }

  return { safe: true }
}

/**
 * 检查文件系统安全性
 */
function checkFileSystemSafety(): SecurityCheckResult {
  try {
    const fs = require('fs')
    const path = require('path')

    // 检查当前工作目录
    const cwd = process.cwd()

    // 如果路径包含生产环境标识
    const prodPathPatterns = [
      '/var/www/',
      '/usr/share/nginx/',
      '/opt/production/',
      '/app/production'
    ]

    for (const pattern of prodPathPatterns) {
      if (cwd.includes(pattern)) {
        return {
          safe: false,
          reason: `工作目录包含生产环境路径: ${pattern}`,
          recommendations: ['在开发目录中运行应用']
        }
      }
    }

    // 检查package.json中的脚本
    const packageJsonPath = path.join(cwd, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const scripts = packageJson.scripts || {}

      // 如果有生产相关脚本，可能是生产环境
      const prodScripts = ['start:prod', 'build:prod', 'deploy:prod']
      const hasProdScripts = Object.keys(scripts).some(script =>
        prodScripts.includes(script)
      )

      if (hasProdScripts && !cwd.includes('dev') && !cwd.includes('test')) {
        return {
          safe: false,
          reason: '检测到生产环境脚本',
          recommendations: ['在开发环境中运行']
        }
      }
    }

  } catch (error) {
    // 文件系统检查失败，但不应该阻止自动登录
    console.warn('文件系统安全检查失败:', error)
  }

  return { safe: true }
}

/**
 * 安全检查装饰器
 * 用于包装需要安全保护的函数
 */
export function withSecurityCheck<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    onFail?: () => void
    logFailures?: boolean
  }
): T {
  return ((...args: Parameters<T>) => {
    const check = performSecurityCheck()

    if (!check.safe) {
      if (options?.logFailures !== false) {
        console.error('🚨 开发环境自动登录安全检查失败:', check.reason)
        console.warn('💡 建议:', check.recommendations?.join(', '))
      }

      if (options?.onFail) {
        options.onFail()
      }

      throw new Error(`安全检查失败: ${check.reason}`)
    }

    return fn(...args)
  }) as T
}

/**
 * 获取安全检查报告
 * 用于调试和监控
 */
export function getSecurityReport(): {
  timestamp: string
  environment: string
  checks: Record<string, SecurityCheckResult>
  overall: SecurityCheckResult
} {
  const timestamp = new Date().toISOString()
  const environment = process.env.NODE_ENV || 'unknown'

  const checks = {
    environmentVariables: checkEnvironmentVariables(),
    databaseConnection: checkDatabaseConnection(),
    hostnameAndDomain: checkHostnameAndDomain(),
    productionIndicators: checkProductionIndicators(),
    fileSystemSafety: checkFileSystemSafety()
  }

  const failures = Object.values(checks).filter(check => !check.safe)
  const overall = {
    safe: failures.length === 0,
    reason: failures.length > 0 ? failures.map(f => f.reason).join('; ') : undefined,
    recommendations: failures.length > 0 ? failures.flatMap(f => f.recommendations || []) : undefined
  }

  return {
    timestamp,
    environment,
    checks,
    overall
  }
}