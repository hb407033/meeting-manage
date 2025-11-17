export const usePasswordStrength = () => {
  const validatePasswordStrength = (password: string) => {
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

  const getPasswordStrengthInfo = (score: number) => {
    if (score <= 2) {
      return {
        level: 'weak',
        description: '弱密码',
        color: 'text-red-500'
      }
    } else if (score <= 4) {
      return {
        level: 'fair',
        description: '一般强度',
        color: 'text-yellow-500'
      }
    } else if (score <= 6) {
      return {
        level: 'good',
        description: '较强密码',
        color: 'text-blue-500'
      }
    } else {
      return {
        level: 'strong',
        description: '强密码',
        color: 'text-green-500'
      }
    }
  }

  return {
    validatePasswordStrength,
    getPasswordStrengthInfo
  }
}