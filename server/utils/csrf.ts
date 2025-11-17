import crypto from 'node:crypto'

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * 生成 CSRF 令牌
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * 验证 CSRF 令牌
 */
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false
  }

  // 使用时间安全的比较
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))
}

/**
 * 设置 CSRF Cookie
 */
export function setCSRFCookie(event: any, token: string, secure = true): void {
  const cookie = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    secure ? 'Secure' : '',
    `Max-Age=${24 * 60 * 60}` // 24小时
  ].filter(Boolean).join('; ')

  setCookie(event, CSRF_COOKIE_NAME, cookie)
}

/**
 * 从请求中获取 CSRF 令牌
 */
export function getCSRFTokenFromRequest(event: any): string | null {
  // 优先从 Header 获取
  const headerToken = getHeader(event, CSRF_HEADER_NAME)
  if (headerToken) {
    return headerToken
  }

  // 从 Cookie 获取
  const cookieToken = getCookie(event, CSRF_COOKIE_NAME)
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * CSRF 中间件
 */
export async function csrfMiddleware(event: any): Promise<boolean> {
  const method = getMethod(event)

  // 对安全方法（GET, HEAD, OPTIONS）跳过 CSRF 检查
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  // 对 API 路径进行 CSRF 检查
  if (getRequestURL(event)?.startsWith('/api/')) {
    const requestToken = getCSRFTokenFromRequest(event)
    const sessionToken = getCookie(event, CSRF_COOKIE_NAME)

    if (!requestToken || !sessionToken) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CSRF token missing'
      })
    }

    if (!verifyCSRFToken(requestToken, sessionToken)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CSRF token invalid'
      })
    }
  }

  return true
}

/**
 * 登录失败计数器
 */
export class LoginAttemptTracker {
  private static instance: LoginAttemptTracker
  private attempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>()

  private constructor() {}

  static getInstance(): LoginAttemptTracker {
    if (!LoginAttemptTracker.instance) {
      LoginAttemptTracker.instance = new LoginAttemptTracker()
    }
    return LoginAttemptTracker.instance
  }

  /**
   * 记录登录尝试
   */
  recordAttempt(email: string): { success: boolean; attemptsLeft: number; lockedUntil?: number } {
    const now = Date.now()
    const existing = this.attempts.get(email) || { count: 0, lastAttempt: 0 }

    // 检查是否仍在锁定期间
    if (existing.lockedUntil && now < existing.lockedUntil) {
      return {
        success: false,
        attemptsLeft: 0,
        lockedUntil: existing.lockedUntil
      }
    }

    // 增加尝试次数
    existing.count++
    existing.lastAttempt = now

    // 检查是否需要锁定
    const maxAttempts = 5
    const lockDuration = 15 * 60 * 1000 // 15分钟

    let attemptsLeft = maxAttempts - existing.count
    let lockedUntil: number | undefined

    if (existing.count >= maxAttempts) {
      existing.lockedUntil = now + lockDuration
      lockedUntil = existing.lockedUntil
      attemptsLeft = 0
    } else {
      // 如果超过1小时没有尝试，重置计数
      const resetThreshold = 60 * 60 * 1000 // 1小时
      if (now - existing.lastAttempt > resetThreshold) {
        existing.count = 1
        attemptsLeft = maxAttempts - 1
      }
    }

    this.attempts.set(email, existing)

    return {
      success: attemptsLeft > 0,
      attemptsLeft,
      lockedUntil
    }
  }

  /**
   * 登录成功，清除尝试记录
   */
  clearAttempts(email: string): void {
    this.attempts.delete(email)
  }

  /**
   * 检查是否被锁定
   */
  isLocked(email: string): boolean {
    const existing = this.attempts.get(email)
    if (!existing || !existing.lockedUntil) {
      return false
    }

    const now = Date.now()
    return now < existing.lockedUntil
  }

  /**
   * 获取锁定剩余时间
   */
  getLockTimeRemaining(email: string): number {
    const existing = this.attempts.get(email)
    if (!existing || !existing.lockedUntil) {
      return 0
    }

    const now = Date.now()
    return Math.max(0, existing.lockedUntil - now)
  }
}

/**
 * IP 限制器
 */
export class IPRateLimiter {
  private static instance: IPRateLimiter
  private requests = new Map<string, { count: number; windowStart: number }>()
  private readonly windowMs: number
  private readonly maxRequests: number

  private constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs // 15分钟
    this.maxRequests = maxRequests
  }

  static getInstance(windowMs?: number, maxRequests?: number): IPRateLimiter {
    if (!IPRateLimiter.instance) {
      IPRateLimiter.instance = new IPRateLimiter(windowMs, maxRequests)
    }
    return IPRateLimiter.instance
  }

  /**
   * 检查是否允许请求
   */
  isAllowed(ip: string): boolean {
    const now = Date.now()
    const existing = this.requests.get(ip)

    if (!existing || now - existing.windowStart > this.windowMs) {
      // 新窗口或窗口已过期
      this.requests.set(ip, {
        count: 1,
        windowStart: now
      })
      return true
    }

    if (existing.count >= this.maxRequests) {
      return false
    }

    existing.count++
    return true
  }

  /**
   * 获取当前请求计数
   */
  getCurrentCount(ip: string): number {
    const existing = this.requests.get(ip)
    if (!existing) {
      return 0
    }

    const now = Date.now()
    if (now - existing.windowStart > this.windowMs) {
      return 0
    }

    return existing.count
  }
}

/**
 * 安全工具函数
 */
export class SecurityUtils {
  /**
   * 验证密码强度
   */
  static validatePassword(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = []
    let score = 0

    // 长度检查
    if (password.length < 8) {
      feedback.push('密码长度至少8位')
    } else if (password.length >= 12) {
      score += 2
    } else {
      score += 1
    }

    // 字符类型检查
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('需要包含小写字母')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('需要包含大写字母')

    if (/\d/.test(password)) score += 1
    else feedback.push('需要包含数字')

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 2
    else feedback.push('需要包含特殊字符')

    // 常见密码检查
    const commonPasswords = ['password', '123456', 'qwerty', 'admin']
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('不能使用常见密码')
      score = Math.max(0, score - 2)
    }

    return {
      isValid: score >= 4 && feedback.length === 0,
      score: Math.min(8, score),
      feedback
    }
  }

  /**
   * 生成安全的会话ID
   */
  static generateSecureSessionId(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 检测可疑活动
   */
  static detectSuspiciousActivity(
    ip: string,
    userAgent: string,
    recentRequests: Array<{ timestamp: number; action: string }>
  ): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = []
    const now = Date.now()
    const recentWindow = 5 * 60 * 1000 // 5分钟

    // 检查请求频率
    const recentRequestsInWindow = recentRequests.filter(
      req => now - req.timestamp < recentWindow
    )

    if (recentRequestsInWindow.length > 50) {
      reasons.push('请求频率过高')
    }

    // 检查相同IP的多次登录尝试
    const loginAttempts = recentRequestsInWindow.filter(
      req => req.action === 'login'
    )

    if (loginAttempts.length > 10) {
      reasons.push('登录尝试次数异常')
    }

    // 检查可疑User-Agent
    const suspiciousUserAgents = ['bot', 'scanner', 'crawler', 'hack']
    if (suspiciousUserAgents.some(pattern =>
      userAgent.toLowerCase().includes(pattern)
    )) {
      reasons.push('可疑的User-Agent')
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    }
  }
}