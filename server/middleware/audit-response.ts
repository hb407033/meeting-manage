import { logApiResponse } from './audit'

/**
 * 审计响应中间件
 * 记录API响应的审计日志
 */
export default defineEventHandler(async (event) => {
  // 在响应处理时记录审计日志
  const originalEnd = event.node.res.end

  event.node.res.end = function (this: any, ...args: any[]) {
    // 记录审计日志
    logApiResponse(event, args[0]).catch(error => {
      console.error('Failed to log audit response:', error)
    })

    // 调用原始的end方法
    return originalEnd.apply(this, args)
  }
})