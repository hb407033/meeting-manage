import { PrismaClient } from '@prisma/client'

// 数据库连接池配置
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  errorFormat: 'pretty' as const,
}

// Prisma客户端实例
let prisma: PrismaClient | null = null

/**
 * 获取Prisma数据库客户端实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient(prismaConfig)

    // 连接事件监听
    prisma.$connect()
      .then(() => {
        console.log('✅ 数据库连接成功')
      })
      .catch((error) => {
        console.error('❌ 数据库连接失败:', error)
      })

    // 优雅关闭处理
    process.on('beforeExit', async () => {
      await prisma?.$disconnect()
    })

    process.on('SIGINT', async () => {
      await prisma?.$disconnect()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      await prisma?.$disconnect()
      process.exit(0)
    })
  }

  return prisma
}

/**
 * 数据库服务类
 */
export class DatabaseService {
  private client: PrismaClient

  constructor() {
    this.client = getPrismaClient()
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    try {
      const startTime = Date.now()
      await this.client.$queryRaw`SELECT 1`
      const latency = Date.now() - startTime

      return { status: 'healthy', latency }
    } catch (error) {
      console.error('数据库健康检查失败:', error)
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 事务执行
   */
  async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await this.client.$transaction(fn)
  }

  /**
   * 批量操作
   */
  async batch<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await this.client.$transaction(fn)
  }

  /**
   * 原始SQL查询
   */
  async rawQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    return await this.client.$queryRawUnsafe(query, ...(params || []))
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    tables: Array<{ name: string; count: number }>
    connections: { active: number; max: number }
  }> {
    try {
      // 获取表的记录数
      const tableCounts = await this.client.$queryRaw<Array<{ table_name: string; table_count: bigint }>>`
        SELECT
          table_name as 'table_name',
          table_rows as 'table_count'
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      ` as any

      const tables = tableCounts.map(row => ({
        name: row.table_name,
        count: Number(row.table_count)
      }))

      // 获取连接信息
      const connectionInfo = await this.client.$queryRaw<Array<{ variable_name: string; variable_value: string }>>`
        SHOW STATUS LIKE 'Threads_connected'
      ` as any

      const activeConnections = connectionInfo.length > 0
        ? parseInt(connectionInfo[0].variable_value)
        : 0

      return {
        tables,
        connections: {
          active: activeConnections,
          max: parseInt(process.env.DATABASE_POOL_MAX || '10')
        }
      }
    } catch (error) {
      console.error('获取数据库统计信息失败:', error)
      return {
        tables: [],
        connections: { active: 0, max: 10 }
      }
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<{ deletedRecords: number }> {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    try {
      // 清理过期的审计日志
      const deletedAuditLogs = await this.client.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: oneMonthAgo
          }
        }
      })

      // 清理过期的设备使用记录
      const deletedDeviceUsages = await this.client.deviceUsage.deleteMany({
        where: {
          startTime: {
            lt: oneMonthAgo
          }
        }
      })

      const deletedRecords = deletedAuditLogs.count + deletedDeviceUsages.count

      return { deletedRecords }
    } catch (error) {
      console.error('清理过期数据失败:', error)
      return { deletedRecords: 0 }
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (prisma) {
      await prisma.$disconnect()
      prisma = null
    }
  }

  // 导出Prisma客户端实例
  get prisma(): PrismaClient {
    return this.client
  }
}

// 导出单例实例
export const databaseService = new DatabaseService()

// 导出Prisma客户端
export { PrismaClient }

// 默认导出
export default databaseService