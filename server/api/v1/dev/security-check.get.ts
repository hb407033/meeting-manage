/**
 * 开发环境安全检查API
 * 返回当前环境的安全检查结果
 */

import { isDevAutoLoginEnabled, isDevAutoLoginSafe } from '~~/server/utils/environment'
import { getSecurityReport } from '~~/server/utils/dev-login-security'

export default defineEventHandler(async (event) => {
  try {
    // 执行安全检查
    const securityReport = getSecurityReport()

    return securityReport

  } catch (error) {
    console.error('安全检查失败:', error)

    // 返回错误状态的安全报告
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      checks: {},
      overall: {
        safe: false,
        reason: '安全检查执行失败: ' + error.message,
        recommendations: [
          '检查服务器配置',
          '确认开发环境设置',
          '联系开发人员'
        ]
      }
    }
  }
})