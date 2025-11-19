import { successResponse, errorResponse, validationErrorResponse } from '~~/server/utils/response'
import { validate, ValidationSchemas } from '~~/server/utils/validation'
import { generateTokenPair } from '~~/server/utils/jwt'
import { hashPassword, validatePasswordStrength } from '~~/server/utils/password'
import prisma from '~~/server/services/database'
import { CacheService } from '~~/server/services/redis'
import { AppErrors, asyncHandler } from '~~/server/api/middleware/errorHandler'
import { registerRateLimit } from '~~/server/api/middleware/rateLimit'

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

    // 验证密码强度
    const passwordStrength = validatePasswordStrength(password)
    if (!passwordStrength.isValid) {
      throw AppErrors.validationError(
        'Password does not meet security requirements',
        passwordStrength.feedback
      )
    }

    // 初始化服务
    const cache = new CacheService()

    // 检查邮箱是否已存在（规范化处理）
    const normalizedEmail = email.toLowerCase().trim()
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      throw AppErrors.emailExistsError()
    }

    // 加密密码
    const hashedPassword = await hashPassword(password)

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      }
    })

    // 生成JWT令牌
    const tokenPair = generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
      role: 'USER'
    })

    // 尝试缓存操作（如果Redis不可用则跳过）
    try {
      await cache.connect()
      // 清除可能的缓存
      await cache.del(`user:${normalizedEmail}`)
      // 缓存用户信息
      await cache.setJSON(
        `user:${newUser.id}`,
        newUser,
        3600 // 1小时
      )
    } catch (cacheError) {
      console.warn('Redis cache operation failed, proceeding without cache:', cacheError)
    } finally {
      try {
        await cache.disconnect()
      } catch (disconnectError) {
        console.warn('Redis disconnect failed:', disconnectError)
      }
    }

    return successResponse({
      user: newUser,
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    }, 'User registered successfully')

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