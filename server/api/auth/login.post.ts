import { successResponse } from '~~/server/utils/response'
import { generateTokenPair } from '~~/server/utils/jwt'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    // 暂时禁用限流和复杂验证，简化登录流程
    const body = await readBody(event)
    const { email, password } = body

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱和密码不能为空'
      })
    }

    // 直接使用Prisma进行数据库查询
    const prisma = new PrismaClient()

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: '账户已被禁用'
      })
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    // 生成JWT令牌
    const tokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // 移除密码字段后返回用户信息
    const { password: _, ...userWithoutPassword } = user

    return successResponse({
      user: userWithoutPassword,
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    }, '登录成功')

  } catch (error: any) {
    // 处理已知错误
    if (error.statusCode) {
      throw error
    }

    // 处理数据库错误
    if (error.code === 'P2025') {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    // 处理其他错误
    throw createError({
      statusCode: 500,
      statusMessage: '登录失败'
    })
  }
})