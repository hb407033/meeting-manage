/**
 * 用户登录API
 * POST /api/v1/auth/login
 */
import prisma from '~~/server/services/database'
import { compare } from 'bcryptjs'
import { generateTokenPair } from '~~/server/utils/jwt'
import { getClientIP } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password } = body

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱和密码不能为空'
      })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: '账户已被禁用'
      })
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    // 获取用户角色信息
    const roles = user.userRoles.map(ur => ur.role.code)
    const primaryRole = roles[0] || 'USER'

    // 生成token
    const tokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: primaryRole
    })

    // 更新登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: getClientIP(event)
      }
    })

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: primaryRole,
          roles: roles
        },
        ...tokenPair
      },
      message: '登录成功'
    }

  } catch (error) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '登录失败'
    })
  }
})