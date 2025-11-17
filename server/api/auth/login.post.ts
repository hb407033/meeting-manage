import { successResponse, errorResponse } from '~~/server/utils/response'
import { generateTokenPair } from '~~/server/utils/jwt'
import { verifyPassword } from '~~/server/utils/password'
import { getPrismaClient } from '~~/server/services/database'
import { LoginAttemptTracker, IPRateLimiter, SecurityUtils } from '~~/server/utils/csrf'
import { loginRateLimit } from '~~/server/api/middleware/rateLimit'

export default defineEventHandler(async (event) => {
  // 应用限流
  await loginRateLimit(event)

  try {
    const body = await readBody(event)
    const { email, password } = body

    // 输入验证
    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱和密码不能为空'
      })
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: '邮箱格式不正确'
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 检查登录尝试次数
    const attemptTracker = LoginAttemptTracker.getInstance()
    const attemptResult = attemptTracker.recordAttempt(normalizedEmail)

    if (!attemptResult.success) {
      if (attemptResult.lockedUntil) {
        const lockTimeRemaining = Math.ceil((attemptResult.lockedUntil - Date.now()) / 60000)
        throw createError({
          statusCode: 429,
          statusMessage: `账户已被锁定，请 ${lockTimeRemaining} 分钟后再试`
        })
      } else {
        throw createError({
          statusCode: 429,
          statusMessage: `登录尝试次数过多，还剩 ${attemptResult.attemptsLeft} 次机会`
        })
      }
    }

    // IP 限制检查
    const ipLimiter = IPRateLimiter.getInstance(15 * 60 * 1000, 20) // 15分钟20次请求
    const clientIP = getClientIP(event)
    if (!ipLimiter.isAllowed(clientIP)) {
      throw createError({
        statusCode: 429,
        statusMessage: 'IP请求频率过高，请稍后再试'
      })
    }

    // 检测可疑活动
    const userAgent = getHeader(event, 'user-agent') || ''
    const suspiciousActivity = SecurityUtils.detectSuspiciousActivity(clientIP, userAgent, [])
    if (suspiciousActivity.suspicious) {
      console.warn('Suspicious activity detected:', {
        ip: clientIP,
        userAgent,
        reasons: suspiciousActivity.reasons
      })
    }

    // 使用Prisma客户端
    const prisma = getPrismaClient()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isActive: true,
        createdAt: true,
        // 获取用户角色信息
        userRoles: {
          include: {
            role: {
              select: {
                name: true,
                code: true,
                level: true,
                isActive: true
              }
            }
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

    // 检查用户是否激活
    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: '账户已被禁用，请联系管理员'
      })
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: '邮箱或密码错误'
      })
    }

    // 确定用户角色（取最高级别的角色）
    let userRole = 'USER'
    let permissions: string[] = []

    if (user.userRoles && user.userRoles.length > 0) {
      // 按角色级别排序，取最高级别
      const sortedRoles = user.userRoles
        .filter(ur => ur.role.isActive)
        .sort((a, b) => (b.role?.level || 0) - (a.role?.level || 0))

      if (sortedRoles.length > 0) {
        userRole = sortedRoles[0].role?.code || 'USER'

        // 根据角色分配相应权限
        if (userRole === 'ADMIN') {
          // 管理员拥有所有权限
          permissions = [
            'user:read', 'user:create', 'user:update', 'user:delete',
            'role:read', 'role:create', 'role:update', 'role:delete', 'role:assign',
            'room:read', 'room:create', 'room:update', 'room:delete', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'system:read', 'system:update', 'audit:read',
            'device:manage', 'device:read-data'
          ]
        } else if (userRole === 'MANAGER') {
          // 部门经理拥有部门内权限
          permissions = [
            'user:read', 'user:create', 'user:update',
            'room:read', 'room:create', 'room:update', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'device:read-data'
          ]
        } else {
          // 普通用户只有基础权限
          permissions = [
            'room:read',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel'
          ]
        }
      }
    }

    // 生成JWT令牌
    const tokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: userRole
    })

    // 清除登录尝试记录
    attemptTracker.clearAttempts(normalizedEmail)

    // 更新最后登录信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: clientIP,
        loginAttempts: 0,
        lockedUntil: null
      }
    })

    // 移除敏感字段后返回用户信息
    const { password: _, userRoles, ...userWithoutSensitive } = user

    return successResponse({
      user: {
        ...userWithoutSensitive,
        role: userRole,
        permissions
      },
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

    // 记录登录错误日志（如果需要）
    console.error('Login error:', error)

    // 处理其他错误
    throw createError({
      statusCode: 500,
      statusMessage: '登录失败，请稍后重试'
    })
  }
})

/**
 * 获取客户端IP地址
 */
function getClientIP(event: any): string {
  const headers = event.node.req.headers

  // 检查代理头
  const forwardedFor = headers['x-forwarded-for']
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim()
  }

  const realIP = headers['x-real-ip']
  if (realIP) {
    return realIP as string
  }

  const clientIP = headers['cf-connecting-ip'] // Cloudflare
  if (clientIP) {
    return clientIP as string
  }

  return event.node.req.socket?.remoteAddress || 'unknown'
}