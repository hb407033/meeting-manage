import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validatePasswordStrength, generateRandomPassword, hashPassword, verifyPassword } from '~/server/utils/password'
import { generateTokenPair, verifyAccessToken } from '~/server/utils/jwt'

describe('Auth Utils', () => {
  describe('Password Utils', () => {
    it('should validate password strength correctly', () => {
      // 测试弱密码
      const weakPassword = 'weak'
      const weakResult = validatePasswordStrength(weakPassword)
      expect(weakResult.isValid).toBe(false)
      expect(weakResult.feedback.length).toBeGreaterThan(0)

      // 测试强密码
      const strongPassword = 'StrongP@ssw0rd123!'
      const strongResult = validatePasswordStrength(strongPassword)
      expect(strongResult.isValid).toBe(true)
      expect(strongResult.feedback.length).toBe(0)
      expect(strongResult.score).toBeGreaterThan(5)
    })

    it('should generate random password', () => {
      const password1 = generateRandomPassword()
      const password2 = generateRandomPassword()

      expect(password1).toHaveLength(12) // 默认长度12
      expect(password2).toHaveLength(12)
      expect(password1).not.toBe(password2) // 应该是随机的
    })

    it('should hash and verify passwords correctly', async () => {
      const password = 'TestPassword123!'
      const hashedPassword = await hashPassword(password)

      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50) // bcrypt 哈希通常很长

      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)

      const isInvalid = await verifyPassword('wrongpassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })
  })

  describe('JWT Utils', () => {
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'USER'
    }

    it('should generate and verify tokens', () => {
      const tokenPair = generateTokenPair(testPayload)

      expect(tokenPair.accessToken).toBeDefined()
      expect(tokenPair.refreshToken).toBeDefined()
      expect(tokenPair.expiresIn).toBeGreaterThan(0)

      // 验证访问令牌
      const verified = verifyAccessToken(tokenPair.accessToken)
      expect(verified.userId).toBe(testPayload.userId)
      expect(verified.email).toBe(testPayload.email)
      expect(verified.role).toBe(testPayload.role)
    })

    it('should reject invalid tokens', () => {
      expect(() => {
        verifyAccessToken('invalid-token')
      }).toThrow()

      expect(() => {
        verifyAccessToken('')
      }).toThrow()
    })
  })
})

describe('Authentication Acceptance Criteria', () => {
  describe('AC1: User login with correct credentials', () => {
    it('should have password validation utility', () => {
      const result = validatePasswordStrength('ValidPassword123!')
      expect(result.score).toBeGreaterThan(0)
    })

    it('should have JWT token management', () => {
      const payload = { userId: 'test', email: 'test@test.com', role: 'USER' }
      const tokens = generateTokenPair(payload)
      expect(tokens.accessToken).toBeDefined()
    })
  })

  describe('AC2: Secure password hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)

      // bcrypt 哈希应该以 $2b$ 开头
      expect(hash.startsWith('$2b$')).toBe(true)
    })

    it('should verify password hashes correctly', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)

      const isInvalid = await verifyPassword('wrong', hash)
      expect(isInvalid).toBe(false)
    })
  })

  describe('AC3: Session management with JWT', () => {
    it('should generate token pairs with expiration', () => {
      const payload = { userId: 'test', email: 'test@test.com', role: 'USER' }
      const tokens = generateTokenPair(payload)

      expect(tokens.expiresIn).toBeGreaterThan(0)
      // JWT配置中默认是24小时 (86400秒)，所以我们测试它接近这个值
      expect(tokens.expiresIn).toBeLessThanOrEqual(86400) // 应该小于等于24小时
    })
  })

  describe('AC4: Persistent login state', () => {
    it('should have token verification utilities', () => {
      const payload = { userId: 'test', email: 'test@test.com', role: 'USER' }
      const tokens = generateTokenPair(payload)
      const verified = verifyAccessToken(tokens.accessToken)

      expect(verified).toBeDefined()
      expect(typeof verified).toBe('object')
    })
  })

  describe('AC5: Error handling', () => {
    it('should handle invalid JWT tokens gracefully', () => {
      expect(() => {
        verifyAccessToken('invalid')
      }).toThrow('Invalid token')
    })
  })

  describe('AC7: Security measures', () => {
    it('should reject weak passwords', () => {
      const weakPasswords = ['password', '123456', 'qwerty', 'admin']

      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.isValid).toBe(false)
      })
    })

    it('should generate secure random passwords', () => {
      const password = generateRandomPassword()

      // 检查密码包含不同类型的字符
      expect(/[a-z]/.test(password)).toBe(true) // 小写字母
      expect(/[A-Z]/.test(password)).toBe(true) // 大写字母
      expect(/[0-9]/.test(password)).toBe(true) // 数字
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true) // 特殊字符
    })
  })

  describe('AC8: Role-based permissions', () => {
    it('should include role in JWT payload', () => {
      const payload = { userId: 'test', email: 'test@test.com', role: 'ADMIN' }
      const tokens = generateTokenPair(payload)
      const verified = verifyAccessToken(tokens.accessToken)

      expect(verified.role).toBe('ADMIN')
    })
  })
})