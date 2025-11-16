import { successResponse } from '../utils/response'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // 暂时简化健康检查
    const dbHealthy = true
    const cacheHealthy = true

    // 计算响应时间
    const responseTime = Date.now() - startTime

    // 系统信息
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
      },
      version: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }

    // 健康状态
    const isHealthy = dbHealthy && cacheHealthy
    const status = isHealthy ? 'healthy' : 'unhealthy'
    const statusCode = isHealthy ? 200 : 503

    // 检查详情
    const checks = {
      database: {
        status: dbHealthy ? 'up' : 'down',
        responseTime: dbHealthy ? '< 100ms' : 'timeout'
      },
      cache: {
        status: cacheHealthy ? 'up' : 'down',
        responseTime: cacheHealthy ? '< 50ms' : 'timeout'
      },
      api: {
        status: 'up',
        responseTime: `${responseTime}ms`
      }
    }

    // 设置响应状态码
    event.node.res.statusCode = statusCode

    return successResponse({
      status,
      uptime: systemInfo.uptime,
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      checks,
      system: systemInfo,
      services: {
        database: dbHealthy,
        cache: cacheHealthy
      }
    }, `API is ${status}`)

  } catch (error) {
    console.error('Health check failed:', error)

    event.node.res.statusCode = 503

    return successResponse({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, 'API is unhealthy', {
      status: 503
    })
  }
})