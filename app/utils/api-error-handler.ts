/**
 * API错误处理工具函数
 */

interface ZodFieldError {
  origin: string
  code: string
  minimum?: number
  maximum?: number
  inclusive: boolean
  path: string[]
  message: string
}

interface ApiError {
  success: false
  data: ZodFieldError[] | null
  code: string
  message: string
  meta: {
    timestamp: string
  }
}

/**
 * 解析API验证错误并生成友好的错误消息
 */
export function parseApiError(error: any): string {
  // 如果是H3验证错误格式
  if (error && typeof error === 'object' && 'data' in error) {
    const h3Error = error as any

    // 如果有验证错误详情数组
    if (h3Error.data && Array.isArray(h3Error.data) && h3Error.data.length > 0) {
      return formatValidationErrors(h3Error.data)
    }

    // 如果有消息字段
    if (h3Error.message) {
      return h3Error.message
    }
  }

  // 如果是Nuxt错误对象的cause字段
  if (error && typeof error === 'object' && 'cause' in error) {
    const cause = error.cause
    if (cause && Array.isArray(cause) && cause.length > 0) {
      return formatValidationErrors(cause)
    }
  }

  // 如果是直接传递的验证错误数组
  if (Array.isArray(error) && error.length > 0) {
    return formatValidationErrors(error)
  }

  // 如果是标准API错误格式
  if (error && typeof error === 'object' && 'data' in error) {
    const apiError = error as ApiError

    // 如果有验证错误详情
    if (apiError.data && Array.isArray(apiError.data) && apiError.data.length > 0) {
      return formatValidationErrors(apiError.data)
    }

    // 如果有消息字段
    if (apiError.message) {
      return apiError.message
    }
  }

  // 如果是错误对象且有message字段
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message
  }

  // 默认错误消息
  return '操作失败，请重试'
}

/**
 * 格式化验证错误为用户友好的消息
 */
function formatValidationErrors(errors: ZodFieldError[]): string {
  const fieldErrors: string[] = []

  errors.forEach(error => {
    const fieldPath = error.path.join('.')
    const friendlyMessage = getValidationErrorMessage(error)
    fieldErrors.push(`${getFieldName(fieldPath)}: ${friendlyMessage}`)
  })

  return fieldErrors.join('\n')
}

/**
 * 获取字段的中文名称
 */
function getFieldName(fieldPath: string): string {
  const fieldNames: Record<string, string> = {
    'name': '会议室名称',
    'capacity': '容量',
    'rules.minBookingDuration': '最短预约时长',
    'rules.maxBookingDuration': '最长预约时长',
    'rules.allowedTimeRange.start': '允许预约开始时间',
    'rules.allowedTimeRange.end': '允许预约结束时间',
    'rules.allowedTimeRange': '允许预约时间范围',
    'rules': '预约规则',
    'requiresApproval': '需要审批',
    'equipment': '设备配置',
    'equipment.projector': '投影仪',
    'equipment.whiteboard': '白板',
    'equipment.videoConf': '视频会议',
    'equipment.airCondition': '空调',
    'equipment.wifi': 'WiFi',
    'equipment.tv': '电视',
    'equipment.customEquipment': '其他设备',
    'location': '位置',
    'description': '描述',
    'status': '状态',
    'images': '图片'
  }

  return fieldNames[fieldPath] || fieldPath
}

/**
 * 根据验证错误类型生成友好的错误消息
 */
function getValidationErrorMessage(error: ZodFieldError): string {
  switch (error.code) {
    case 'too_small':
      if (error.minimum !== undefined) {
        if (error.origin === 'number') {
          return `不能小于 ${error.minimum}`
        } else if (error.origin === 'string') {
          return `长度不能少于 ${error.minimum} 个字符`
        }
      }
      return '值太小'

    case 'too_large':
      if (error.maximum !== undefined) {
        if (error.origin === 'number') {
          return `不能大于 ${error.maximum}`
        } else if (error.origin === 'string') {
          return `长度不能超过 ${error.maximum} 个字符`
        }
      }
      return '值太大'

    case 'invalid_string':
      if (error.message.includes('时间格式')) {
        return '时间格式不正确，请使用 HH:MM 格式（如：09:00）'
      }
      return '格式不正确'

    case 'invalid_type':
      // 根据字段路径和期望类型给出具体的错误消息
      const fieldPath = error.path.join('.')
      if (error.expected === 'boolean') {
        return '请选择是或否'
      } else if (error.expected === 'number') {
        return '请输入有效的数字'
      } else if (error.expected === 'string') {
        return '请输入有效的文本'
      }
      return `数据类型不正确，期望${error.expected}类型`

    case 'invalid_literal':
      return '值无效'

    case 'invalid_enum_value':
      return '请选择有效的选项'

    default:
      return error.message || '验证失败'
  }
}

/**
 * 解析Zod错误详情（适用于不同版本的错误格式）
 */
export function parseZodErrors(errorData: any): ZodFieldError[] {
  if (!Array.isArray(errorData)) {
    return []
  }

  return errorData.map(item => {
    // 如果已经是标准格式
    if (item.origin && item.code && item.path) {
      return item as ZodFieldError
    }

    // 如果是其他格式，尝试转换
    return {
      origin: item.origin || 'unknown',
      code: item.code || 'unknown',
      minimum: item.minimum,
      maximum: item.maximum,
      inclusive: item.inclusive !== false,
      path: Array.isArray(item.path) ? item.path : [],
      message: item.message || '验证失败'
    }
  })
}