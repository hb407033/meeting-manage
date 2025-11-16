import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: number
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'meeting-manage-api',
    audience: 'meeting-manage-client'
  })
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'meeting-manage-api',
    audience: 'meeting-manage-client'
  })
}

/**
 * 生成令牌对
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // 计算过期时间（秒）
  const expiresIn = jwt.decode(accessToken) as any
  const expirationTime = expiresIn.exp - Math.floor(Date.now() / 1000)

  return {
    accessToken,
    refreshToken,
    expiresIn: expirationTime
  }
}

/**
 * 验证访问令牌
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'meeting-manage-api',
      audience: 'meeting-manage-client'
    }) as JWTPayload

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    } else {
      throw new Error('Token verification failed')
    }
  }
}

/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'meeting-manage-api',
      audience: 'meeting-manage-client'
    }) as JWTPayload

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    } else {
      throw new Error('Refresh token verification failed')
    }
  }
}

/**
 * 从令牌中提取用户信息
 */
export function extractUserFromToken(token: string): Omit<JWTPayload, 'iat' | 'exp'> | null {
  try {
    const decoded = verifyAccessToken(token)
    const { iat, exp, ...user } = decoded
    return user
  } catch (error) {
    return null
  }
}

/**
 * 检查令牌是否即将过期
 */
export function isTokenExpiringSoon(token: string, thresholdMinutes: number = 15): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) {
      return true
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const threshold = thresholdMinutes * 60

    return decoded.exp - currentTime <= threshold
  } catch (error) {
    return true
  }
}

/**
 * 获取令牌剩余有效时间（秒）
 */
export function getTokenRemainingTime(token: string): number {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) {
      return 0
    }

    const currentTime = Math.floor(Date.now() / 1000)
    return Math.max(0, decoded.exp - currentTime)
  } catch (error) {
    return 0
  }
}

/**
 * 生成临时令牌（用于密码重置等）
 */
export function generateTempToken(payload: any, expiresIn: string = '1h'): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'meeting-manage-api',
    audience: 'meeting-manage-client'
  })
}

/**
 * 验证临时令牌
 */
export function verifyTempToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'meeting-manage-api',
      audience: 'meeting-manage-client'
    })
  } catch (error) {
    throw new Error('Invalid or expired temporary token')
  }
}