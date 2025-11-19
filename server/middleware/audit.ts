import { auditService } from '~~/server/services/audit-service'
import { auditLogger } from '~~/server/utils/audit'
import { getCurrentUser } from '~~/server/utils/auth'
import type { H3Event } from 'h3'

/**
 * 审计中间件
 * 自动记录所有API请求的审计日志
 */
export default defineEventHandler(async (event: H3Event) => {
  // 只对API路由应用审计
  if (!getRequestPath(event).startsWith('/api/')) {
    return
  }

  // 排除健康检查和审计API本身
  const path = getRequestPath(event)
  const excludedPaths = [
    '/api/health',
    '/api/v1/health',
    '/api/_nuxt',
    '/api/v1/admin/audit-logs' // 避免无限循环
  ]

  if (excludedPaths.some(excluded => path.startsWith(excluded))) {
    return
  }

  // 获取请求信息
  const method = getMethod(event)
  const userAgent = getHeader(event, 'user-agent')
  const ipAddress = getClientIP(event) || getHeader(event, 'x-forwarded-for') as string || 'unknown'

  // 获取用户信息
  const user = await getCurrentUser(event)
  const userId = user?.id

  // 解析资源类型和ID
  const { resourceType, resourceId } = parseResourceFromPath(path)

  // 检测风险级别
  const riskLevel = detectRiskLevel(method, path, user)

  // 记录请求开始
  const startTime = Date.now()

  // 在event上存储审计信息，以便在响应处理器中使用
  event.context.audit = {
    userId,
    action: `${method.toLowerCase()}.${resourceType}`,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    riskLevel,
    startTime
  }
})

/**
 * 记录API响应审计日志
 */
export async function logApiResponse(event: H3Event, result?: any, error?: any) {
  const audit = event.context.audit
  if (!audit) return

  const duration = Date.now() - audit.startTime
  const statusCode = getResponseStatus(event)

  // 确定操作结果
  let resultStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'ERROR' = 'SUCCESS'
  if (error) {
    resultStatus = 'ERROR'
  } else if (statusCode >= 400) {
    resultStatus = 'FAILURE'
  } else if (statusCode >= 300) {
    resultStatus = 'PARTIAL'
  }

  // 根据风险级别决定同步还是异步记录
  if (audit.riskLevel === 'CRITICAL' || audit.riskLevel === 'HIGH') {
    // 高风险操作同步记录
    await auditLogger.log({
      userId: audit.userId,
      action: audit.action,
      resourceType: audit.resourceType,
      resourceId: audit.resourceId,
      details: {
        method: getMethod(event),
        path: getRequestPath(event),
        statusCode,
        duration,
        error: error?.message,
        result: result
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      result: resultStatus,
      riskLevel: audit.riskLevel
    })
  } else {
    // 普通操作异步记录
    await auditService.logAsync({
      userId: audit.userId,
      action: audit.action,
      resourceType: audit.resourceType,
      resourceId: audit.resourceId,
      details: {
        method: getMethod(event),
        path: getRequestPath(event),
        statusCode,
        duration,
        error: error?.message,
        result: result
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      result: resultStatus,
      riskLevel: audit.riskLevel
    })
  }
}

/**
 * 从请求路径解析资源类型和ID
 */
function parseResourceFromPath(path: string): { resourceType: string; resourceId?: string } {
  // 移除API前缀
  const cleanPath = path.replace(/^\/api\/v\d+/, '')

  // 分割路径段
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { resourceType: 'system' }
  }

  const resourceType = segments[0]
  const resourceId = segments[1]

  return { resourceType, resourceId }
}

/**
 * 检测操作的风险级别
 */
function detectRiskLevel(method: string, path: string, user?: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const methodUpper = method.toUpperCase()
  const pathLower = path.toLowerCase()

  // 管理员操作风险更高
  if (pathLower.includes('/admin/')) {
    if (methodUpper === 'DELETE') {
      return 'CRITICAL'
    }
    return 'HIGH'
  }

  // 删除操作是高风险
  if (methodUpper === 'DELETE') {
    return 'HIGH'
  }

  // 创建和修改操作是中等风险
  if (['POST', 'PUT', 'PATCH'].includes(methodUpper)) {
    return 'MEDIUM'
  }

  // 认证相关操作是中等风险
  if (pathLower.includes('/auth/')) {
    return 'MEDIUM'
  }

  // 敏感信息查询是中等风险
  if (pathLower.includes('/users/') || pathLower.includes('/permissions/')) {
    return 'MEDIUM'
  }

  // 默认低风险
  return 'LOW'
}

/**
 * 高风险操作检测
 */
export function isHighRiskOperation(action: string, resourceType: string): boolean {
  const criticalActions = ['delete', 'reset', 'destroy', 'purge', 'admin']
  const criticalResources = ['users', 'permissions', 'roles', 'system']

  const actionLower = action.toLowerCase()
  const resourceLower = resourceType.toLowerCase()

  return criticalActions.some(ca => actionLower.includes(ca)) ||
         criticalResources.some(cr => resourceLower.includes(cr))
}

/**
 * 异常操作模式检测
 */
export function detectSuspiciousPattern(userId: string, action: string, ipAddress: string): boolean {
  // 这里可以实现更复杂的异常检测逻辑
  // 例如：短时间内的频繁操作、异常时间访问、IP地址变更等

  // 简单实现：检测是否有 suspicious 关键字
  return action.toLowerCase().includes('suspicious') ||
         action.toLowerCase().includes('abnormal') ||
         action.toLowerCase().includes('unusual')
}