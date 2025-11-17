import bcrypt from 'bcryptjs'

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')

/**
 * 密码哈希
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    return bcrypt.hash(password, salt)
  } catch (error) {
    throw new Error('Password hashing failed')
  }
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 哈希后的密码
 * @returns 密码是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return bcrypt.compare(password, hashedPassword)
  } catch (error) {
    throw new Error('Password verification failed')
  }
}

/**
 * 生成随机密码
 * @param length 密码长度
 * @returns 随机密码
 */
export function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{};:\'"\\|,.<>/?'

  let password = ''

  // 确保至少包含每种类型的字符
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += special.charAt(Math.floor(Math.random() * special.length))

  // 填充剩余长度
  const allChars = lowercase + uppercase + numbers + special
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  // 打乱密码字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 密码强度信息
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
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

  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('密码需要包含小写字母')
  }

  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('密码需要包含大写字母')
  }

  // 包含数字
  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('密码需要包含数字')
  }

  // 包含特殊字符
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 2
  } else {
    feedback.push('密码需要包含特殊字符')
  }

  // 常见弱密码检查
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    feedback.push('密码不能包含常见的弱密码模式')
    score = Math.max(0, score - 2)
  }

  return {
    isValid: score >= 4 && feedback.length === 0,
    score: Math.min(8, score),
    feedback
  }
}

/**
 * 生成密码强度提示
 * @param score 密码强度分数
 * @returns 强度等级和描述
 */
export function getPasswordStrengthInfo(score: number): {
  level: 'weak' | 'fair' | 'good' | 'strong'
  description: string
  color: string
} {
  if (score <= 2) {
    return {
      level: 'weak',
      description: '弱密码',
      color: 'red'
    }
  } else if (score <= 4) {
    return {
      level: 'fair',
      description: '一般强度',
      color: 'yellow'
    }
  } else if (score <= 6) {
    return {
      level: 'good',
      description: '较强密码',
      color: 'blue'
    }
  } else {
    return {
      level: 'strong',
      description: '强密码',
      color: 'green'
    }
  }
}