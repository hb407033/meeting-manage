import { auditLogger } from '~~/server/utils/audit'
import type { AuditLogData } from '~~/server/utils/audit'

/**
 * 审计服务
 * 提供异步批量处理和高性能的审计日志记录
 */
export class AuditService {
  private static instance: AuditService
  private logQueue: AuditLogData[] = []
  private batchSize = 50
  private flushInterval = 5000 // 5秒
  private flushTimer: NodeJS.Timeout | null = null
  private isProcessing = false

  private constructor() {
    this.startFlushTimer()
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  /**
   * 异步记录审计日志（推荐使用）
   */
  async logAsync(data: AuditLogData): Promise<void> {
    // 添加到队列
    this.logQueue.push({
      ...data,
      timestamp: data.timestamp || new Date()
    } as any)

    // 如果队列达到批量大小，立即处理
    if (this.logQueue.length >= this.batchSize) {
      await this.flush()
    }
  }

  /**
   * 同步记录审计日志（重要操作）
   */
  async logSync(data: AuditLogData): Promise<void> {
    // 高风险操作立即同步写入
    if (data.riskLevel === 'CRITICAL' || data.action?.includes('delete')) {
      await auditLogger.log(data)
    } else {
      await this.logAsync(data)
    }
  }

  /**
   * 立即刷新队列
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return
    }

    this.isProcessing = true
    const batchToProcess = this.logQueue.splice(0, this.batchSize)

    try {
      // 批量写入数据库
      await this.writeBatch(batchToProcess)
    } catch (error) {
      console.error('Failed to write audit log batch:', error)
      // 如果写入失败，重新加入队列（但限制重试次数）
      this.logQueue.unshift(...batchToProcess.slice(0, 10)) // 只重试前10条
    } finally {
      this.isProcessing = false

      // 如果还有待处理的日志，继续处理
      if (this.logQueue.length > 0) {
        // 使用 setImmediate 避免阻塞
        setImmediate(() => this.flush())
      }
    }
  }

  /**
   * 批量写入数据库
   */
  private async writeBatch(logs: AuditLogData[]): Promise<void> {
    if (logs.length === 0) return

    const db = new (await import('./database')).DatabaseService()

    // 使用事务批量插入
    await db.getClient().$transaction(async (tx) => {
      for (const log of logs) {
        await tx.auditLog.create({
          data: {
            userId: log.userId,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            details: log.details ? JSON.stringify(log.details) : null,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            result: log.result || 'SUCCESS',
            riskLevel: log.riskLevel || 'LOW',
            timestamp: log.timestamp || new Date()
          }
        })
      }
    })

    // 输出批量处理统计
    console.log(`[AUDIT] Batch processed ${logs.length} logs`)
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flush()
      }
    }, this.flushInterval)
  }

  /**
   * 停止定时刷新
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * 优雅关闭服务
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer()
    await this.flush() // 处理剩余的日志
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number
    isProcessing: boolean
    batchSize: number
    flushInterval: number
  } {
    return {
      queueLength: this.logQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    }
  }

  /**
   * 记录数据变更
   */
  async logDataChange(
    userId: string,
    action: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const details: any = {
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString()
    }

    if (oldData && newData) {
      // 记录变更的字段
      const changes: Record<string, { old: any; new: any }> = {}

      for (const key in newData) {
        if (oldData[key] !== newData[key]) {
          changes[key] = {
            old: oldData[key],
            new: newData[key]
          }
        }
      }

      details.changes = changes
    } else if (oldData) {
      details.deletedData = oldData
    } else if (newData) {
      details.createdData = newData
    }

    await this.logAsync({
      userId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      result: 'SUCCESS',
      riskLevel: action === 'delete' ? 'HIGH' : 'MEDIUM'
    })
  }

  /**
   * 记录异常行为
   */
  async logAnomalousActivity(
    userId: string | null,
    anomalyType: 'suspicious_login' | 'abnormal_access' | 'privilege_escalation' | 'data_breach_attempt',
    details: any,
    ipAddress: string,
    userAgent?: string,
    riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ): Promise<void> {
    await this.logSync({
      userId,
      action: `anomaly.${anomalyType}`,
      resourceType: 'security',
      details: {
        anomalyType,
        ...details,
        detectedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      result: 'FAILURE',
      riskLevel
    })
  }

  /**
   * 记录API请求响应
   */
  async logApiRequest(
    event: any,
    startTime: number,
    result?: any,
    error?: any
  ): Promise<void> {
    const duration = Date.now() - startTime
    const statusCode = getResponseStatus(event)
    const userId = event.context.auth?.userId

    // 确定操作结果
    let resultStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'ERROR' = 'SUCCESS'
    if (error) {
      resultStatus = 'ERROR'
    } else if (statusCode >= 400) {
      resultStatus = 'FAILURE'
    } else if (statusCode >= 300) {
      resultStatus = 'PARTIAL'
    }

    const audit = event.context.audit
    if (audit) {
      // 更新现有的审计记录
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
    }
  }
}

// 导出单例实例
export const auditService = AuditService.getInstance()

// 导出便捷函数
export const logAuditAsync = auditService.logAsync.bind(auditService)
export const logAuditSync = auditService.logSync.bind(auditService)
export const logDataChange = auditService.logDataChange.bind(auditService)
export const logAnomalousActivity = auditService.logAnomalousActivity.bind(auditService)