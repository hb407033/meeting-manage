/**
 * 开发环境用户创建API
 * 仅在开发环境下可用，用于创建测试用户
 */

import { isDevAutoLoginEnabled, isDevAutoLoginSafe } from '~~/server/utils/environment'
import { createDevUser as createDevUserFromService } from '~~/server/services/dev-user-service'
import prisma from '~~/server/services/database'
import bcrypt from 'bcryptjs'

interface CreateUserRequest {
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
}

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
    const body = await readBody(event) as CreateUserRequest

    // 验证请求数据
    if (!body.name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户名不能为空'
      })
    }

    if (!body.email?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱不能为空'
      })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱格式不正确'
      })
    }

    if (!body.role || !['ADMIN', 'MANAGER', 'USER'].includes(body.role)) {
      throw createError({
        statusCode: 400,
        statusMessage: '角色参数无效'
      })
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: '该邮箱已被使用'
      })
    }

    // 创建开发用户
    const user = await createDevUserFromService({
      email: body.email,
      name: body.name.trim(),
      role: body.role
    })

    console.log(`✅ 创建开发用户成功: ${user.email} (${user.name})`)

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isDevUser: user.isDevUser
      }
    }

  } catch (error) {
    console.error('创建开发用户失败:', error)

    // 如果是已处理的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 处理未预期的错误
    throw createError({
      statusCode: 500,
      statusMessage: '创建用户失败'
    })
  }
})