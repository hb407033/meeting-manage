import { auditService } from './audit-service'
import { auditLogger } from '~~/server/utils/audit'
import prisma from './database'

export interface Alert {
  id: string
  type: 'security' | 'performance' | 'system' | 'compliance'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  source: string
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  details: any
  userId?: string
  ipAddress?: string
}

export interface AlertRule {
  id: string
  name: string
  type: string
  enabled: boolean
  conditions: any
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  cooldownMinutes: number
  lastTriggered?: Date
}

/**
 * 告警服务
 * 负责检测异常情况并发送告警
 */
export class AlertService {
  private static instance: AlertService
  private alerts: Map<string, Alert> = new Map()
  private rules: Map<string, AlertRule> = new Map()
  private alertQueue: Alert[] = []
  private isProcessing = false

  private constructor() {
    this.initializeDefaultRules()
    this.startProcessing()
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService()
    }
    return AlertService.instance
  }

  /**
   * 创建告警
   */
  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    description: string,
    source: string,
    details: any,
    userId?: string,
    ipAddress?: string
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      source,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      details,
      userId,
      ipAddress
    }

    // 检查是否有相同类型的未解决告警（避免重复告警）
    const existingAlert = this.findExistingAlert(type, severity, source)
    if (existingAlert && !existingAlert.acknowledged) {
      return existingAlert
    }

    this.alerts.set(alert.id, alert)
    this.alertQueue.push(alert)

    // 记录告警到审计日志
    await auditLogger.logAnomalousActivity(
      userId || null,
      'alert_triggered',
      {
        alertId: alert.id,
        type,
        severity,
        title,
        source
      },
      ipAddress || 'system',
      undefined,
      severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    )

    return alert
  }

  /**
   * 查找现有的告警
   */
  private findExistingAlert(type: string, severity: string, source: string): Alert | null {
    for (const alert of this.alerts.values()) {
      if (
        alert.type === type &&
        alert.severity === severity &&
        alert.source === source &&
        !alert.acknowledged &&
        !alert.resolved &&
        (Date.now() - alert.timestamp.getTime() < 30 * 60 * 1000) // 30分钟内
      ) {
        return alert
      }
    }
    return null
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      return false
    }

    alert.acknowledged = true
    alert.acknowledgedBy = userId
    alert.acknowledgedAt = new Date()

    await auditLogger.logAdminAction(
      userId,
      'acknowledge',
      'alert',
      alertId,
      {
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title
      }
    )

    return true
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      return false
    }

    alert.resolved = true
    alert.resolvedBy = userId
    alert.resolvedAt = new Date()

    if (resolution) {
      alert.details.resolution = resolution
    }

    await auditLogger.logAdminAction(
      userId,
      'resolve',
      'alert',
      alertId,
      {
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title,
        resolution
      }
    )

    return true
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(filter?: {
    type?: Alert['type']
    severity?: Alert['severity']
    acknowledged?: boolean
    resolved?: boolean
  }): Alert[] {
    let alerts = Array.from(this.alerts.values())

    if (filter) {
      alerts = alerts.filter(alert => {
        if (filter.type && alert.type !== filter.type) return false
        if (filter.severity && alert.severity !== filter.severity) return false
        if (filter.acknowledged !== undefined && alert.acknowledged !== filter.acknowledged) return false
        if (filter.resolved !== undefined && alert.resolved !== filter.resolved) return false
        return true
      })
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number
    active: number
    critical: number
    high: number
    acknowledged: number
    resolved: number
  } {
    const alerts = Array.from(this.alerts.values())

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      critical: alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length,
      high: alerts.filter(a => a.severity === 'HIGH' && !a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      resolved: alerts.filter(a => a.resolved).length
    }
  }

  /**
   * 检测异常并发送告警
   */
  async detectAndAlert(): Promise<void> {
    try {
      await this.detectSuspiciousActivity()
      await this.detectPerformanceIssues()
      await this.detectSystemAnomalies()
      await this.detectComplianceViolations()
    } catch (error) {
      console.error('Error in alert detection:', error)
    }
  }

  /**
   * 检测可疑活动
   */
  private async detectSuspiciousActivity(): Promise<void> {
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    // 检测频繁登录失败
    const failedLogins = await prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: 'user.login.failure',
        timestamp: {
          gte: oneHourAgo
        }
      },
      _count: true
    })

    for (const item of failedLogins) {
      if (Number(item._count) >= 10) {
        await this.createAlert(
          'security',
          'HIGH',
          '频繁登录失败检测',
          `IP地址 ${item.ipAddress} 在1小时内登录失败 ${Number(item._count)} 次`,
          'authentication',
          {
            ipAddress: item.ipAddress,
            failureCount: Number(item._count),
            timeWindow: '1小时'
          },
          undefined,
          item.ipAddress
        )
      }
    }

    // 检测高风险操作激增
    const highRiskOps = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        riskLevel: {
          in: ['HIGH', 'CRITICAL']
        },
        timestamp: {
          gte: oneHourAgo
        }
      },
      _count: true
    })

    for (const item of highRiskOps) {
      if (Number(item._count) >= 5) {
        await this.createAlert(
          'security',
          'CRITICAL',
          '高风险操作激增',
          `用户 ${item.userId} 在1小时内执行了 ${Number(item._count)} 次高风险操作`,
          'user_activity',
          {
            userId: item.userId,
            operationCount: Number(item._count),
            timeWindow: '1小时'
          },
          item.userId
        )
      }
    }
  }

  /**
   * 检测性能问题
   */
  private async detectPerformanceIssues(): Promise<void> {
    // 这里可以实现性能相关的告警逻辑
    // 例如：API响应时间过长、数据库连接数过高、内存使用率过高等
  }

  /**
   * 检测系统异常
   */
  private async detectSystemAnomalies(): Promise<void> {
    // 这里可以实现系统级别的异常检测
    // 例如：服务不可用、磁盘空间不足、网络连接问题等
  }

  /**
   * 检测合规违规
   */
  private async detectComplianceViolations(): Promise<void> {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // 检测敏感操作未记录
    const sensitiveOpsWithoutAudit = await prisma.$queryRaw`
      SELECT 'Missing audit for admin operations' as issue, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= ${oneDayAgo}
        AND action LIKE 'admin.%'
        AND result = 'ERROR'
    `

    // 这里可以添加更多合规性检查
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'failed_login_threshold',
        name: '登录失败阈值告警',
        type: 'security',
        enabled: true,
        conditions: {
          action: 'user.login.failure',
          count: 10,
          timeWindow: '1h'
        },
        severity: 'HIGH',
        cooldownMinutes: 30
      },
      {
        id: 'high_risk_operations',
        name: '高风险操作告警',
        type: 'security',
        enabled: true,
        conditions: {
          riskLevel: ['HIGH', 'CRITICAL'],
          count: 5,
          timeWindow: '1h'
        },
        severity: 'CRITICAL',
        cooldownMinutes: 15
      }
    ]

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }

  /**
   * 启动处理循环
   */
  private startProcessing(): void {
    // 每分钟检测一次异常
    setInterval(() => {
      this.detectAndAlert()
    }, 60 * 1000)

    // 处理告警队列
    setInterval(() => {
      this.processAlertQueue()
    }, 5 * 1000)
  }

  /**
   * 处理告警队列
   */
  private async processAlertQueue(): Promise<void> {
    if (this.isProcessing || this.alertQueue.length === 0) {
      return
    }

    this.isProcessing = true
    const alertsToProcess = this.alertQueue.splice(0, 10) // 每次处理10个告警

    try {
      for (const alert of alertsToProcess) {
        await this.sendAlert(alert)
      }
    } catch (error) {
      console.error('Error processing alerts:', error)
      // 重新放回队列
      this.alertQueue.unshift(...alertsToProcess)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 发送告警通知
   */
  private async sendAlert(alert: Alert): Promise<void> {
    try {
      // 这里可以实现多种通知方式：
      // 1. 数据库记录
      // 2. 邮件通知
      // 3. 短信通知
      // 4. Webhook通知
      // 5. 实时推送（WebSocket）

      console.log(`[ALERT] ${alert.severity}: ${alert.title}`, alert)

      // 根据严重程度决定通知方式
      if (alert.severity === 'CRITICAL') {
        // 立即发送所有类型的通知
        await this.sendImmediateNotification(alert)
      } else if (alert.severity === 'HIGH') {
        // 发送邮件和实时通知
        await this.sendEmailNotification(alert)
        await this.sendRealTimeNotification(alert)
      } else {
        // 只发送实时通知
        await this.sendRealTimeNotification(alert)
      }

    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  /**
   * 发送立即通知
   */
  private async sendImmediateNotification(alert: Alert): Promise<void> {
    // 实现立即通知逻辑（例如：短信、电话等）
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    // 实现邮件通知逻辑
  }

  /**
   * 发送实时通知
   */
  private async sendRealTimeNotification(alert: Alert): Promise<void> {
    // 实现实时通知逻辑（WebSocket、SSE等）
  }
}

// 导出单例实例
export const alertService = AlertService.getInstance()

// 导出便捷函数
export const createAlert = alertService.createAlert.bind(alertService)
export const acknowledgeAlert = alertService.acknowledgeAlert.bind(alertService)
export const resolveAlert = alertService.resolveAlert.bind(alertService)
export const getActiveAlerts = alertService.getActiveAlerts.bind(alertService)