import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Authentication API', async () => {
  await setup({
    rootDir: process.cwd(),
    server: true,
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: process.env.DATABASE_URL || 'mysql://root:407033@localhost:3307/meeting_manage_test',
        jwtSecret: 'test-secret-key-for-testing'
      }
    }
  })

  beforeEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User'
      }

      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: userData
      })

      expect(response.success).toBe(true)
      expect(response.data.user.email).toBe(userData.email)
      expect(response.data.user.name).toBe(userData.name)
      expect(response.data.tokens.accessToken).toBeDefined()
      expect(response.data.tokens.refreshToken).toBeDefined()

      // 验证用户在数据库中存在
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(user).toBeTruthy()
      expect(user?.email).toBe(userData.email)
      expect(user?.name).toBe(userData.name)
    })

    it('should reject duplicate email registration', async () => {
      // 先注册一个用户
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          name: 'Existing User',
          isActive: true,
          authMethod: 'LOCAL'
        }
      })

      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User'
      }

      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: userData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.message).toContain('already exists')
    })

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        name: 'Test User'
      }

      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: userData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
    })

    it('should validate password strength', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      }

      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: userData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.message).toContain('password')
    })

    it('should enforce rate limiting', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User'
      }

      // 尝试多次注册（超过限制）
      const promises = Array(5).fill(null).map(() =>
        $fetch('/api/auth/register', {
          method: 'POST',
          body: { ...userData, email: `test-${Math.random()}@example.com` }
        }, { throwOnError: false })
      )

      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]

      // 最后一个请求应该被限制
      expect(lastResult.success).toBe(false)
      expect(lastResult.message).toContain('Too many')
    })
  })

  describe('POST /api/auth/login', () => {
    let testUser: any

    beforeEach(async () => {
      // 创建测试用户
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.default.hash('TestPassword123!', 12)

      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
          isActive: true,
          authMethod: 'LOCAL'
        }
      })
    })

    it('should login with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }

      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: loginData
      })

      expect(response.success).toBe(true)
      expect(response.data.user.email).toBe(loginData.email)
      expect(response.data.tokens.accessToken).toBeDefined()
      expect(response.data.tokens.refreshToken).toBeDefined()
    })

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      }

      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: loginData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.statusMessage).toContain('邮箱或密码错误')
    })

    it('should reject incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      }

      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: loginData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.statusMessage).toContain('邮箱或密码错误')
    })

    it('should reject inactive user', async () => {
      // 将用户设置为非活跃
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      })

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }

      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: loginData
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.statusMessage).toContain('已被禁用')

      // 恢复用户状态
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: true }
      })
    })

    it('should enforce login rate limiting', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!' // 故意使用错误密码
      }

      // 尝试多次登录
      const promises = Array(6).fill(null).map(() =>
        $fetch('/api/auth/login', {
          method: 'POST',
          body: loginData
        }, { throwOnError: false })
      )

      const results = await Promise.all(promises)
      const lastResult = results[results.length - 1]

      // 最后一个请求应该被限制
      expect(lastResult.success).toBe(false)
      expect(lastResult.statusMessage).toContain('次数过多')
    })
  })

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      // 创建并登录用户获取刷新令牌
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.default.hash('TestPassword123!', 12)

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
          isActive: true,
          authMethod: 'LOCAL'
        }
      })

      const loginResponse = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPassword123!'
        }
      })

      refreshToken = loginResponse.data.tokens.refreshToken
    })

    it('should refresh tokens successfully', async () => {
      const response = await $fetch('/api/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken
        }
      })

      expect(response.success).toBe(true)
      expect(response.data.tokens.accessToken).toBeDefined()
      expect(response.data.tokens.refreshToken).toBeDefined()
      expect(response.data.tokens.expiresIn).toBeGreaterThan(0)
    })

    it('should reject invalid refresh token', async () => {
      const response = await $fetch('/api/auth/refresh', {
        method: 'POST',
        body: {
          refreshToken: 'invalid-refresh-token'
        }
      }, { throwOnError: false })

      expect(response.success).toBe(false)
      expect(response.statusMessage).toContain('刷新令牌无效')
    })
  })

  describe('POST /api/auth/logout', () => {
    let accessToken: string
    let refreshToken: string

    beforeEach(async () => {
      // 创建并登录用户获取令牌
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.default.hash('TestPassword123!', 12)

      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
          isActive: true,
          authMethod: 'LOCAL'
        }
      })

      const loginResponse = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPassword123!'
        }
      })

      accessToken = loginResponse.data.tokens.accessToken
      refreshToken = loginResponse.data.tokens.refreshToken
    })

    it('should logout successfully', async () => {
      const response = await $fetch('/api/auth/logout', {
        method: 'POST',
        body: {
          accessToken,
          refreshToken
        }
      })

      expect(response.success).toBe(true)
      expect(response.message).toContain('登出成功')
    })

    it('should logout even with invalid tokens', async () => {
      const response = await $fetch('/api/auth/logout', {
        method: 'POST',
        body: {
          accessToken: 'invalid-token',
          refreshToken: 'invalid-token'
        }
      })

      expect(response.success).toBe(true) // 登出应该总是成功
    })
  })
})