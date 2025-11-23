/**
 * 开发环境可用用户列表API
 * 返回当前开发环境下的所有可切换用户
 */

import { isDevAutoLoginEnabled, isDevAutoLoginSafe } from '~~/server/utils/environment'
import { getDevUsers } from '~~/server/services/dev-user-service'

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
    // 获取所有开发用户
    const devUsers = await getDevUsers()

    return {
      success: true,
      users: devUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isDevUser: user.isDevUser
      })),
      total: devUsers.length
    }

  } catch (error) {
    console.error('获取开发用户列表失败:', error)

    throw createError({
      statusCode: 500,
      statusMessage: '获取用户列表失败'
    })
  }
})