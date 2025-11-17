/**
 * 通用API认证中间件
 * 自动为所有API路由添加认证和用户上下文设置
 */

import { authMiddleware } from '~~/server/api/middleware/auth'

export default defineEventHandler(async (event) => {
  // 只对 /api/v1/ 路径进行认证处理
  if (event.node.req.url?.startsWith('/api/v1/')) {
    try {
      // 执行认证并设置用户上下文
      const auth = await authMiddleware(event)
      event.context.user = auth.user
    } catch (error: any) {
      // 如果认证失败，抛出错误
      throw error
    }
  }
})