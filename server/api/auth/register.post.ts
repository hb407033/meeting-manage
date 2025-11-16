import { successResponse, errorResponse, validationErrorResponse } from '~~/server/utils/response'
import { validate, ValidationSchemas } from '~~/server/utils/validation'
import { generateTokenPair } from '~~/server/utils/jwt'
import { DatabaseService } from '~~/server/services/database'
import { CacheService } from '~~/server/services/redis'
import { AppErrors, asyncHandler } from '~~/server/api/middleware/errorHandler'
import { registerRateLimit } from '~~/server/api/middleware/rateLimit'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  try {
    // 应用限流
    await registerRateLimit(event)

    // 获取请求体
    const body = await readBody(event)

    // 验证输入数据
    const validation = validate(body, ValidationSchemas.userRegistration)
    if (!validation.isValid) {
      throw AppErrors.validationError('Validation failed', validation.errors)
    }

    const { email, password, name } = validation.data!

    // 初始化服务
    const db = new DatabaseService()
    const cache = new CacheService()

    try {
      await cache.connect()

      // 检查邮箱是否已存在
      const existingUser = await db.getClient().user.findUnique({
        where: { email }
      })

      if (existingUser) {
        throw AppErrors.emailExistsError()
      }

      // 加密密码
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // 创建用户
      const newUser = await db.getClient().user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'USER',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      // 清除可能的缓存
      await cache.del(`user:${email}`)

      // 生成JWT令牌
      const tokenPair = generateTokenPair({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      })

      // 缓存用户信息
      await cache.setJSON(
        `user:${newUser.id}`,
        newUser,
        3600 // 1小时
      )

      return successResponse({
        user: newUser,
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn
        }
      }, 'User registered successfully')

    } finally {
      await cache.disconnect()
    }

  } catch (error: any) {
    // 处理已知错误
    if (error.statusCode) {
      throw error
    }

    // 处理数据库错误
    if (error.code === 'P2002') {
      throw AppErrors.emailExistsError()
    }

    // 处理其他错误
    throw AppErrors.databaseError('Registration failed')
  }
})