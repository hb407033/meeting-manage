/**
 * 输入验证工具
 */

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationError {
  field: string
  message: string
  value: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  data?: any
}

/**
 * 验证器类
 */
export class Validator {
  private errors: ValidationError[] = []

  /**
   * 验证输入数据
   */
  validate(data: any, schema: ValidationSchema): ValidationResult {
    this.errors = []
    const validatedData: any = {}

    for (const field in schema) {
      const rule = schema[field]
      const value = data[field]

      try {
        const validatedValue = this.validateField(field, value, rule)
        validatedData[field] = validatedValue
      } catch (error) {
        // 字段验证错误已添加到errors数组
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      data: this.errors.length === 0 ? validatedData : undefined
    }
  }

  /**
   * 验证单个字段
   */
  private validateField(field: string, value: any, rule: ValidationRule): any {
    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      this.addError(field, `${field} is required`, value)
      return value
    }

    // 如果不是必填且值为空，跳过其他验证
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return value
    }

    // 类型验证
    if (rule.type && !this.validateType(value, rule.type)) {
      this.addError(field, `${field} must be of type ${rule.type}`, value)
      return value
    }

    // 字符串特定验证
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        this.addError(field, `${field} must be at least ${rule.minLength} characters`, value)
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        this.addError(field, `${field} must not exceed ${rule.maxLength} characters`, value)
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        this.addError(field, `${field} format is invalid`, value)
      }
    }

    // 数字特定验证
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        this.addError(field, `${field} must be at least ${rule.min}`, value)
      }
      if (rule.max !== undefined && value > rule.max) {
        this.addError(field, `${field} must not exceed ${rule.max}`, value)
      }
    }

    // 枚举验证
    if (rule.enum && !rule.enum.includes(value)) {
      this.addError(field, `${field} must be one of: ${rule.enum.join(', ')}`, value)
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (customResult !== true) {
        this.addError(field, typeof customResult === 'string' ? customResult : `${field} is invalid`, value)
      }
    }

    return value
  }

  /**
   * 验证类型
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value)
      case 'url':
        return typeof value === 'string' && this.isValidUrl(value)
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value))
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null
      default:
        return true
    }
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 添加验证错误
   */
  private addError(field: string, message: string, value: any): void {
    this.errors.push({ field, message, value })
  }

  /**
   * 清除错误
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * 获取错误列表
   */
  getErrors(): ValidationError[] {
    return this.errors
  }
}

/**
 * 创建验证器实例
 */
export function createValidator(): Validator {
  return new Validator()
}

/**
 * 快速验证函数
 */
export function validate(data: any, schema: ValidationSchema): ValidationResult {
  const validator = new Validator()
  return validator.validate(data, schema)
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  // 用户相关
  email: {
    required: true,
    type: 'email' as const,
    maxLength: 255
  },
  password: {
    required: true,
    type: 'string' as const,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  name: {
    required: true,
    type: 'string' as const,
    minLength: 2,
    maxLength: 100
  },

  // 会议室相关
  roomName: {
    required: true,
    type: 'string' as const,
    minLength: 2,
    maxLength: 100
  },
  capacity: {
    required: true,
    type: 'number' as const,
    min: 1,
    max: 1000
  },
  equipment: {
    type: 'array' as const,
    custom: (value: any[]) => {
      if (!Array.isArray(value)) return false
      return value.every(item => typeof item === 'string')
    }
  },

  // 预约相关
  startTime: {
    required: true,
    type: 'date' as const,
    custom: (value: string) => {
      const date = new Date(value)
      return date > new Date()
    }
  },
  endTime: {
    required: true,
    type: 'date' as const,
    custom: (value: string, data: any) => {
      const endDate = new Date(value)
      const startDate = new Date(data.startTime)
      return endDate > startDate
    }
  },
  title: {
    required: true,
    type: 'string' as const,
    minLength: 2,
    maxLength: 200
  },
  description: {
    type: 'string' as const,
    maxLength: 1000
  },

  // 分页相关
  page: {
    type: 'number' as const,
    min: 1,
    custom: (value: any) => {
      return parseInt(value) === Number(value)
    }
  },
  limit: {
    type: 'number' as const,
    min: 1,
    max: 100,
    custom: (value: any) => {
      return parseInt(value) === Number(value)
    }
  },

  // 通用
  id: {
    type: 'number' as const,
    min: 1,
    custom: (value: any) => {
      return parseInt(value) === Number(value)
    }
  },
  uuid: {
    type: 'string' as const,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  }
} as const

/**
 * 常用验证模式
 */
export const ValidationSchemas = {
  // 用户注册
  userRegistration: {
    email: ValidationRules.email,
    password: ValidationRules.password,
    name: ValidationRules.name
  },

  // 用户登录
  userLogin: {
    email: ValidationRules.email,
    password: {
      required: true,
      type: 'string' as const,
      minLength: 1
    }
  },

  // 创建会议室
  createRoom: {
    name: ValidationRules.roomName,
    capacity: ValidationRules.capacity,
    equipment: ValidationRules.equipment,
    location: {
      required: true,
      type: 'string' as const,
      maxLength: 100
    }
  },

  // 创建预约
  createReservation: {
    roomId: ValidationRules.id,
    startTime: ValidationRules.startTime,
    endTime: ValidationRules.endTime,
    title: ValidationRules.title,
    description: ValidationRules.description
  },

  // 分页查询
  pagination: {
    page: {
      ...ValidationRules.page,
      required: false
    },
    limit: {
      ...ValidationRules.limit,
      required: false
    }
  }
} as const