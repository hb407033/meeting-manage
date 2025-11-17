import { successResponse, errorResponse } from '~~/server/utils/response'
import { verifyRefreshToken, generateTokenPair } from '~~/server/utils/jwt'
import { DatabaseService } from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { refreshToken } = body

    if (!refreshToken) {
      throw createError({
        statusCode: 400,
        statusMessage: '刷新令牌不能为空'
      })
    }

    // 验证刷新令牌
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (error: any) {
      throw createError({
        statusCode: 401,
        statusMessage: '刷新令牌无效或已过期'
      })
    }

    // 验证用户仍然存在且活跃
    const dbService = new DatabaseService()
    const user = await dbService.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        // 获取用户角色信息
        userRoles: {
          include: {
            role: {
              select: {
                name: true,
                code: true,
                level: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户不存在或已被禁用'
      })
    }

    // 检查账户是否被锁定
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw createError({
        statusCode: 403,
        statusMessage: '账户已被锁定，请稍后再试'
      })
    }

    // 确定用户角色和权限
    let userRole = 'USER'
    let permissions: string[] = []

    if (user.userRoles && user.userRoles.length > 0) {
      // 按角色级别排序，取最高级别
      const sortedRoles = user.userRoles
        .filter(ur => ur.role.isActive)
        .sort((a, b) => (b.role?.level || 0) - (a.role?.level || 0))

      if (sortedRoles.length > 0) {
        userRole = sortedRoles[0].role?.code || 'USER'
        permissions = [`${userRole.toLowerCase()}:read`]
      }
    }

    // 生成新的令牌对
    const newTokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: userRole
    })

    return successResponse({
      tokens: {
        accessToken: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        expiresIn: newTokenPair.expiresIn
      }
    }, '令牌刷新成功')

  } catch (error: any) {
    // 处理已知错误
    if (error.statusCode) {
      throw error
    }

    // 记录令牌刷新错误日志
    console.error('Token refresh error:', error)

    // 处理其他错误
    throw createError({
      statusCode: 500,
      statusMessage: '令牌刷新失败，请重新登录'
    })
  }
})