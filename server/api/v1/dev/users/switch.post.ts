/**
 * 开发环境用户切换API
 * 仅在开发环境下可用，用于切换不同用户进行测试
 */

import { isDevAutoLoginEnabled, isDevAutoLoginSafe } from '~~/server/utils/environment'
import { ensureDevUserExists, getDevUsers } from '~~/server/services/dev-user-service'
import { generateTokenPair } from '~~/server/utils/jwt'
import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  // 安全检查
  if (!isDevAutoLoginEnabled()) {
    throw createError({
      statusCode: 403,
      statusMessage: '开发环境自动登录未启用'
    })
  }

  if (!isDevAutoLoginSafe()) {
    throw createError({
      statusCode: 403,
      statusMessage: '仅在开发环境下可用'
    })
  }

  try {
    const body = await readBody(event)
    const { userId } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少用户ID参数'
      })
    }

    // 获取完整用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: '用户不存在'
      })
    }

    // 确保是开发用户
    if (!user.isDevUser) {
      throw createError({
        statusCode: 403,
        statusMessage: '仅允许切换开发用户'
      })
    }

    // 提取权限列表
    const permissions = user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.code)
    )

    // 生成新的JWT token
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name),
      permissions
    })

    // 设置cookie
    setCookie(event, 'auth_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 // 1小时
    })

    setCookie(event, 'refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7天
    })

    // 更新用户最后登录信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: getClientIP(event) || 'unknown'
      }
    })

    // 记录操作日志
    console.log(`🔧 Dev User Switch: 切换到用户 ${user.email} (${user.name})`)
    console.log(`📋 角色: ${user.userRoles.map(ur => ur.role.name).join(', ')}`)
    console.log(`🔑 权限数量: ${permissions.length}`)

    return {
      success: true,
      tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.userRoles.map(ur => ur.role.name),
        isDevUser: user.isDevUser
      }
    }

  } catch (error) {
    console.error('开发环境用户切换失败:', error)

    // 如果是已处理的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 处理未预期的错误
    throw createError({
      statusCode: 500,
      statusMessage: '用户切换失败'
    })
  }
})