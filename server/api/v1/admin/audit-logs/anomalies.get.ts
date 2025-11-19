import { auditLogger } from '~~/server/utils/audit'
import { hasPermission } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getServerSession(event)
    if (!user || !await hasPermission(user.id, 'audit:analyze')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要审计日志分析权限'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const {
      hours = '24', // 分析时间范围（小时）
      severity = 'all' // 严重程度: low, medium, high, all
    } = query

    // 参数验证
    const hoursNum = Math.min(168, Math.max(1, parseInt(hours as string) || 24)) // 最多7天
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hoursNum)

    // 获取数据库实例
    const db = new (await import('~~/server/services/database')).DatabaseService()

    // 并行检测各种异常模式
    const [
      frequentFailures,
      suspiciousIPs,
      unusualAccessPatterns,
      privilegeEscalations,
      highRiskOperations,
      timeBasedAnomalies,
      errorSpike
    ] = await Promise.all([
      // 检测频繁失败操作
      detectFrequentFailures(db, startDate, severity),

      // 检测可疑IP地址
      detectSuspiciousIPs(db, startDate, severity),

      // 检测异常访问模式
      detectUnusualAccessPatterns(db, startDate, severity),

      // 检测权限升级尝试
      detectPrivilegeEscalations(db, startDate, severity),

      // 检测高风险操作激增
      detectHighRiskOperations(db, startDate, severity),

      // 检测时间基异常（非工作时间访问等）
      detectTimeBasedAnomalies(db, startDate, severity),

      // 检测错误激增
      detectErrorSpike(db, startDate, severity)
    ])

    // 汇总异常检测结果
    const anomalies = {
      frequentFailures,
      suspiciousIPs,
      unusualAccessPatterns,
      privilegeEscalations,
      highRiskOperations,
      timeBasedAnomalies,
      errorSpike
    }

    // 计算风险评分
    const riskScore = calculateRiskScore(anomalies)

    // 生成安全建议
    const recommendations = generateSecurityRecommendations(anomalies, riskScore)

    // 记录审计日志
    await auditLogger.logAdminAction(
      user.id,
      'analyze',
      'audit_anomalies',
      undefined,
      {
        periodHours: hoursNum,
        severity,
        riskScore,
        anomalyCount: Object.values(anomalies).reduce((sum, anomaly) => sum + (anomaly.length || 0), 0)
      },
      getClientIP(event),
      getHeader(event, 'user-agent')
    )

    return createSuccessResponse({
      analysisPeriod: {
        startDate,
        endDate: new Date(),
        hours: hoursNum
      },
      riskScore,
      severity,
      anomalies,
      recommendations,
      summary: {
        totalAnomalies: Object.values(anomalies).reduce((sum, anomaly) => sum + (anomaly.length || 0), 0),
        highRiskCount: Object.values(anomalies).reduce((sum, anomaly) =>
          sum + (anomaly as any[]).filter((item: any) => item.risk === 'HIGH').length, 0
        ),
        criticalRiskCount: Object.values(anomalies).reduce((sum, anomaly) =>
          sum + (anomaly as any[]).filter((item: any) => item.risk === 'CRITICAL').length, 0
        )
      }
    })

  } catch (error) {
    console.error('Failed to analyze audit anomalies:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '分析审计日志异常失败'
    })
  }
})

/**
 * 检测频繁失败操作
 */
async function detectFrequentFailures(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      userId,
      action,
      COUNT(*) as failureCount,
      COUNT(DISTINCT DATE(timestamp)) as affectedDays,
      MAX(timestamp) as lastOccurrence
    FROM audit_logs
    WHERE result = 'FAILURE'
      AND timestamp >= ${startDate}
    GROUP BY userId, action
    HAVING failureCount >= 5
    ORDER BY failureCount DESC
    LIMIT 20
  ` as Array<{
    userId: string
    action: string
    failureCount: bigint
    affectedDays: bigint
    lastOccurrence: Date
  }>

  return result.map(item => ({
    type: 'frequent_failures',
    userId: item.userId,
    action: item.action,
    failureCount: Number(item.failureCount),
    affectedDays: Number(item.affectedDays),
    lastOccurrence: item.lastOccurrence,
    risk: Number(item.failureCount) > 20 ? 'HIGH' : 'MEDIUM',
    description: `用户在${Number(item.affectedDays)}天内${item.action}操作失败${Number(item.failureCount)}次`
  }))
}

/**
 * 检测可疑IP地址
 */
async function detectSuspiciousIPs(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      ipAddress,
      COUNT(DISTINCT userId) as userCount,
      COUNT(*) as totalRequests,
      COUNT(CASE WHEN result = 'FAILURE' THEN 1 END) as failureCount,
      COUNT(CASE WHEN riskLevel = 'HIGH' OR riskLevel = 'CRITICAL' THEN 1 END) as highRiskCount
    FROM audit_logs
    WHERE timestamp >= ${startDate}
      AND ipAddress IS NOT NULL
    GROUP BY ipAddress
    HAVING (userCount >= 3 OR failureCount >= 10 OR highRiskCount >= 5)
    ORDER BY totalRequests DESC
    LIMIT 15
  ` as Array<{
    ipAddress: string
    userCount: bigint
    totalRequests: bigint
    failureCount: bigint
    highRiskCount: bigint
  }>

  return result.map(item => ({
    type: 'suspicious_ip',
    ipAddress: item.ipAddress,
    userCount: Number(item.userCount),
    totalRequests: Number(item.totalRequests),
    failureCount: Number(item.failureCount),
    highRiskCount: Number(item.highRiskCount),
    risk: Number(item.highRiskCount) >= 10 ? 'CRITICAL' :
          Number(item.userCount) >= 5 ? 'HIGH' : 'MEDIUM',
    description: `IP地址${item.ipAddress}有${Number(item.userCount)}个不同用户访问，失败${Number(item.failureCount)}次`
  }))
}

/**
 * 检测异常访问模式
 */
async function detectUnusualAccessPatterns(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      userId,
      resourceType,
      COUNT(*) as accessCount,
      COUNT(DISTINCT DATE_FORMAT(timestamp, '%Y-%m-%d %H')) as activeHours,
      MIN(timestamp) as firstAccess,
      MAX(timestamp) as lastAccess
    FROM audit_logs
    WHERE timestamp >= ${startDate}
      AND action LIKE '%read%'
    GROUP BY userId, resourceType
    HAVING accessCount >= 100 AND activeHours >= 8
    ORDER BY accessCount DESC
    LIMIT 20
  ` as Array<{
    userId: string
    resourceType: string
    accessCount: bigint
    activeHours: bigint
    firstAccess: Date
    lastAccess: Date
  }>

  return result.map(item => ({
    type: 'unusual_access_pattern',
    userId: item.userId,
    resourceType: item.resourceType,
    accessCount: Number(item.accessCount),
    activeHours: Number(item.activeHours),
    firstAccess: item.firstAccess,
    lastAccess: item.lastAccess,
    risk: Number(item.accessCount) > 500 ? 'HIGH' : 'MEDIUM',
    description: `用户访问${item.resourceType}资源${Number(item.accessCount)}次，活跃${Number(item.activeHours)}小时`
  }))
}

/**
 * 检测权限升级尝试
 */
async function detectPrivilegeEscalations(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().auditLog.findMany({
    where: {
      timestamp: {
        gte: startDate
      },
      action: {
        contains: 'permission'
      },
      OR: [
        { result: 'FAILURE' },
        { riskLevel: { in: ['HIGH', 'CRITICAL'] } }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 15
  })

  return result.map(item => ({
    type: 'privilege_escalation_attempt',
    userId: item.userId,
    userName: item.user?.name,
    action: item.action,
    result: item.result,
    riskLevel: item.riskLevel,
    timestamp: item.timestamp,
    risk: item.riskLevel === 'CRITICAL' ? 'CRITICAL' :
          item.result === 'FAILURE' ? 'HIGH' : 'MEDIUM',
    description: `权限操作${item.action}，结果：${item.result}`
  }))
}

/**
 * 检测高风险操作激增
 */
async function detectHighRiskOperations(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
      action,
      COUNT(*) as operationCount
    FROM audit_logs
    WHERE timestamp >= ${startDate}
      AND (riskLevel = 'HIGH' OR riskLevel = 'CRITICAL')
    GROUP BY hour, action
    HAVING operationCount >= 10
    ORDER BY hour DESC, operationCount DESC
    LIMIT 20
  ` as Array<{
    hour: Date
    action: string
    operationCount: bigint
  }>

  return result.map(item => ({
    type: 'high_risk_operations_spike',
    hour: item.hour,
    action: item.action,
    operationCount: Number(item.operationCount),
    risk: Number(item.operationCount) >= 50 ? 'CRITICAL' : 'HIGH',
    description: `${item.action}操作在${item.hour}时达到${Number(item.operationCount)}次`
  }))
}

/**
 * 检测时间基异常
 */
async function detectTimeBasedAnomalies(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      userId,
      COUNT(*) as afterHoursAccess,
      MIN(timestamp) as firstAfterHoursAccess
    FROM audit_logs
    WHERE timestamp >= ${startDate}
      AND (HOUR(timestamp) < 6 OR HOUR(timestamp) > 22)
      AND resourceType != 'auth'
    GROUP BY userId
    HAVING afterHoursAccess >= 5
    ORDER BY afterHoursAccess DESC
    LIMIT 15
  ` as Array<{
    userId: string
    afterHoursAccess: bigint
    firstAfterHoursAccess: Date
  }>

  return result.map(item => ({
    type: 'time_based_anomaly',
    userId: item.userId,
    afterHoursAccess: Number(item.afterHoursAccess),
    firstAfterHoursAccess: item.firstAfterHoursAccess,
    risk: Number(item.afterHoursAccess) >= 20 ? 'HIGH' : 'MEDIUM',
    description: `用户在非工作时间访问${Number(item.afterHoursAccess)}次`
  }))
}

/**
 * 检测错误激增
 */
async function detectErrorSpike(db: any, startDate: Date, severity: string) {
  const result = await db.getClient().$queryRaw`
    SELECT
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
      resourceType,
      COUNT(*) as errorCount
    FROM audit_logs
    WHERE timestamp >= ${startDate}
      AND result = 'ERROR'
    GROUP BY hour, resourceType
    HAVING errorCount >= 20
    ORDER BY hour DESC, errorCount DESC
    LIMIT 15
  ` as Array<{
    hour: Date
    resourceType: string
    errorCount: bigint
  }>

  return result.map(item => ({
    type: 'error_spike',
    hour: item.hour,
    resourceType: item.resourceType,
    errorCount: Number(item.errorCount),
    risk: Number(item.errorCount) >= 100 ? 'HIGH' : 'MEDIUM',
    description: `${item.resourceType}在${item.hour}时出现${Number(item.errorCount)}次错误`
  }))
}

/**
 * 计算风险评分
 */
function calculateRiskScore(anomalies: any): number {
  let score = 0

  Object.values(anomalies).forEach((anomalyList: any) => {
    anomalyList.forEach((anomaly: any) => {
      switch (anomaly.risk) {
        case 'CRITICAL':
          score += 10
          break
        case 'HIGH':
          score += 5
          break
        case 'MEDIUM':
          score += 2
          break
        case 'LOW':
          score += 1
          break
      }
    })
  })

  return Math.min(score, 100) // 限制最大值为100
}

/**
 * 生成安全建议
 */
function generateSecurityRecommendations(anomalies: any, riskScore: number): string[] {
  const recommendations: string[] = []

  if (riskScore >= 50) {
    recommendations.push('系统风险评分较高，建议立即进行全面安全审查')
  }

  if (anomalies.frequentFailures.length > 0) {
    recommendations.push('发现频繁失败操作，建议检查相关功能并加强用户培训')
  }

  if (anomalies.suspiciousIPs.length > 0) {
    recommendations.push('检测到可疑IP地址，建议实施IP限制或加强身份验证')
  }

  if (anomalies.privilegeEscalations.length > 0) {
    recommendations.push('发现权限升级尝试，建议立即审查相关账户权限')
  }

  if (anomalies.timeBasedAnomalies.length > 0) {
    recommendations.push('检测到非正常时间访问，建议加强访问时间控制')
  }

  if (anomalies.errorSpike.length > 0) {
    recommendations.push('发现错误激增，建议检查系统健康状况')
  }

  if (recommendations.length === 0) {
    recommendations.push('当前安全状况良好，建议继续监控')
  }

  return recommendations
}