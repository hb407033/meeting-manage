import { DatabaseService } from '../services/database'

export interface AuditLogData {
  userId?: string
  action: string
  resourceType: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * 审计日志工具
 */
export class AuditLogger {
  private static instance: AuditLogger

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * 记录审计日志
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      const db = new DatabaseService()

      await db.getClient().auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date()
        }
      })

      // 对于重要事件，也输出到控制台
      if (data.action.includes('login') || data.action.includes('delete')) {
        console.log(`[AUDIT]: ${data.action}`, {
          userId: data.userId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress
        })
      }

    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }

  /**
   * 记录登录事件
   */
  async logLogin(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: success ? 'user.login.success' : 'user.login.failure',
      resourceType: 'auth',
      details: { email, success },
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录登录失败事件（包含具体原因）
   */
  async logLoginFailure(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'user.login.failure',
      resourceType: 'auth',
      details: { email, reason },
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录账户锁定事件
   */
  async logAccountLock(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'user.account.locked',
      resourceType: 'auth',
      details: { email, reason },
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录权限访问事件
   */
  async logPermissionAccess(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `permission.${action}.${granted ? 'granted' : 'denied'}`,
      resourceType,
      resourceId,
      details: { granted, permissionAction: action },
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录数据访问事件
   */
  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录可疑活动
   */
  async logSuspiciousActivity(
    reason: string,
    details: any,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'security.suspicious_activity',
      resourceType: 'security',
      details: { reason, ...details },
      ipAddress,
      userAgent
    })
  }

  /**
   * 记录管理员操作
   */
  async logAdminAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `admin.${action}`,
      resourceType,
      resourceId,
      details: { ...details, adminAction: true },
      ipAddress,
      userAgent
    })
  }

  /**
   * 查询审计日志
   */
  async query(filters: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: Date
    endDate?: Date
    ipAddress?: string
  } = {}): Promise<any[]> {
    try {
      const db = new DatabaseService()
      const where: any = {}

      if (filters.userId) {
        where.userId = filters.userId
      }
      if (filters.action) {
        where.action = {
          contains: filters.action
        }
      }
      if (filters.resourceType) {
        where.resourceType = filters.resourceType
      }
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) {
          where.timestamp.gte = filters.startDate
        }
        if (filters.endDate) {
          where.timestamp.lte = filters.endDate
        }
      }
      if (filters.ipAddress) {
        where.ipAddress = filters.ipAddress
      }

      const logs = await db.getClient().auditLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        },
        take: 100 // 限制返回数量
      })

      return logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }))

    } catch (error) {
      console.error('Failed to query audit logs:', error)
      return []
    }
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivityStats(userId: string, days: number = 30): Promise<{
    totalActions: number
    actionBreakdown: Record<string, number>
    recentActivity: Array<{
      timestamp: Date
      action: string
      resourceType: string
    }>
  }> {
    try {
      const db = new DatabaseService()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const logs = await db.getClient().auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      })

      const totalActions = logs.length

      // 统计各种操作的数量
      const actionBreakdown: Record<string, number> = {}
      logs.forEach(log => {
        const actionKey = log.action.split('.')[0] // 取主要操作类型
        actionBreakdown[actionKey] = (actionBreakdown[actionKey] || 0) + 1
      })

      // 最近的活动
      const recentActivity = logs.slice(0, 10).map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        resourceType: log.resourceType
      }))

      return {
        totalActions,
        actionBreakdown,
        recentActivity
      }

    } catch (error) {
      console.error('Failed to get user activity stats:', error)
      return {
        totalActions: 0,
        actionBreakdown: {},
        recentActivity: []
      }
    }
  }
}

// 导出单例实例
export const auditLogger = AuditLogger.getInstance()

// 为了向后兼容，导出常用的函数
export const createAuditLog = auditLogger.log.bind(auditLogger)