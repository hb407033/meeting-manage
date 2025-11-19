import { auditLogger } from '~~/server/utils/audit'
import { getCurrentUser, hasPermission } from '~~/server/utils/auth'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户权限
    const user = await getCurrentUser(event)
    if (!user || !await hasPermission(event, 'audit:export')) {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，需要审计日志导出权限'
      })
    }

    // 获取请求体
    const body = await readBody(event)
    const {
      format = 'xlsx', // xlsx, csv, json
      filters = {},
      fields = [
        'id', 'timestamp', 'userName', 'userEmail', 'action',
        'resourceType', 'resourceId', 'result', 'riskLevel',
        'ipAddress', 'details'
      ]
    } = body

    // 验证导出格式
    const validFormats = ['xlsx', 'csv', 'json']
    if (!validFormats.includes(format)) {
      throw createError({
        statusCode: 400,
        statusMessage: '不支持的导出格式'
      })
    }

    // 构建查询条件
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = { contains: filters.action }
    if (filters.resourceType) where.resourceType = filters.resourceType
    if (filters.resourceId) where.resourceId = filters.resourceId
    if (filters.result) where.result = filters.result
    if (filters.riskLevel) where.riskLevel = filters.riskLevel
    if (filters.ipAddress) where.ipAddress = filters.ipAddress

    // 时间范围过滤
    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate)
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate)
    }

    // 获取数据库实例
    const db = new (await import('~~/server/services/database')).DatabaseService()

    // 限制导出数量以防止性能问题
    const maxExportLimit = 10000
    const logs = await db.getClient().auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: maxExportLimit
    })

    // 处理数据格式
    const processedLogs = logs.map(log => {
      const processed: any = {}

      fields.forEach(field => {
        switch (field) {
          case 'id':
            processed.id = log.id
            break
          case 'timestamp':
            processed.timestamp = log.timestamp.toISOString()
            break
          case 'userName':
            processed.userName = log.user?.name || ''
            break
          case 'userEmail':
            processed.userEmail = log.user?.email || ''
            break
          case 'action':
            processed.action = log.action
            break
          case 'resourceType':
            processed.resourceType = log.resourceType
            break
          case 'resourceId':
            processed.resourceId = log.resourceId || ''
            break
          case 'result':
            processed.result = log.result || ''
            break
          case 'riskLevel':
            processed.riskLevel = log.riskLevel || ''
            break
          case 'ipAddress':
            processed.ipAddress = log.ipAddress || ''
            break
          case 'details':
            processed.details = log.details ? JSON.stringify(log.details) : ''
            break
          default:
            processed[field] = (log as any)[field] || ''
        }
      })

      return processed
    })

    // 生成导出文件
    let filename: string
    let mimeType: string
    let buffer: Buffer

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')

    switch (format) {
      case 'xlsx':
        filename = `audit-logs-${timestamp}.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        buffer = await generateXLSX(processedLogs, fields)
        break

      case 'csv':
        filename = `audit-logs-${timestamp}.csv`
        mimeType = 'text/csv'
        buffer = await generateCSV(processedLogs, fields)
        break

      case 'json':
        filename = `audit-logs-${timestamp}.json`
        mimeType = 'application/json'
        buffer = await generateJSON(processedLogs)
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: '不支持的导出格式'
        })
    }

    // 记录审计日志
    await auditLogger.logAdminAction(
      user.id,
      'export',
      'audit_logs',
      undefined,
      {
        format,
        recordCount: logs.length,
        filters,
        fields,
        filename
      },
      getClientIP(event),
      getHeader(event, 'user-agent')
    )

    // 设置响应头
    setHeader(event, 'Content-Type', mimeType)
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return buffer

  } catch (error) {
    console.error('Failed to export audit logs:', error)

    // 如果是已知错误，直接抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // 未知错误返回通用错误信息
    throw createError({
      statusCode: 500,
      statusMessage: '导出审计日志失败'
    })
  }
})

/**
 * 生成Excel文件
 */
async function generateXLSX(data: any[], fields: string[]): Promise<Buffer> {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: fields.map(field => {
      // 转换字段名为更友好的显示名称
      const fieldNames: Record<string, string> = {
        id: 'ID',
        timestamp: '时间戳',
        userName: '用户名',
        userEmail: '用户邮箱',
        action: '操作',
        resourceType: '资源类型',
        resourceId: '资源ID',
        result: '结果',
        riskLevel: '风险级别',
        ipAddress: 'IP地址',
        details: '详情'
      }
      return fieldNames[field] || field
    })
  })

  // 设置列宽
  const colWidths = fields.map(field => {
    const lengths = data.map(row => String(row[field] || '').length)
    const maxLength = Math.max(...lengths, field.length)
    return { width: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, '审计日志')

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(excelBuffer)
}

/**
 * 生成CSV文件
 */
async function generateCSV(data: any[], fields: string[]): Promise<Buffer> {
  if (data.length === 0) {
    return Buffer.from('')
  }

  // 生成CSV头部
  const headers = fields.map(field => {
    const fieldNames: Record<string, string> = {
      id: 'ID',
      timestamp: '时间戳',
      userName: '用户名',
      userEmail: '用户邮箱',
      action: '操作',
      resourceType: '资源类型',
      resourceId: '资源ID',
      result: '结果',
      riskLevel: '风险级别',
      ipAddress: 'IP地址',
      details: '详情'
    }
    return fieldNames[field] || field
  }).join(',')

  // 生成CSV数据行
  const rows = data.map(row => {
    return fields.map(field => {
      let value = String(row[field] || '')
      // 处理包含逗号、引号、换行符的字段
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  })

  const csvContent = [headers, ...rows].join('\n')
  return Buffer.from(csvContent, 'utf8')
}

/**
 * 生成JSON文件
 */
async function generateJSON(data: any[]): Promise<Buffer> {
  const jsonContent = JSON.stringify({
    exportTime: new Date().toISOString(),
    totalRecords: data.length,
    records: data
  }, null, 2)

  return Buffer.from(jsonContent, 'utf8')
}