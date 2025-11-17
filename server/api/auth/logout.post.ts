import { successResponse } from '~~/server/utils/response'
import { verifyAccessToken } from '~~/server/utils/jwt'
import { CacheService } from '~~/server/services/redis'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { accessToken, refreshToken } = body

    // 验证访问令牌以获取用户信息
    let userId = null
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken)
        userId = payload.userId
      } catch (error) {
        // 即使令牌无效也继续处理登出
        console.warn('Invalid access token during logout:', error)
      }
    }

    // 清除用户缓存（如果存在）
    if (userId) {
      const cache = new CacheService()
      try {
        await cache.connect()
        await cache.del(`user:${userId}`)
        await cache.del(`auth:${userId}`)
      } catch (error) {
        console.warn('Cache cleanup failed:', error)
      } finally {
        await cache.disconnect()
      }
    }

    // TODO: 将令牌添加到黑名单（可选的安全措施）
    // 这需要实现一个令牌黑名单系统

    return successResponse(null, '登出成功')

  } catch (error: any) {
    // 登出操作通常不应该失败，即使出错也返回成功
    console.error('Logout error:', error)

    return successResponse(null, '登出成功')
  }
})