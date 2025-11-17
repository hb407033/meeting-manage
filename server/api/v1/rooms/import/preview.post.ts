import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requirePermission } from '~~/server/middleware/permission'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { parseCSV, validateCSVData } from '~~/server/utils/csv'
import { RoomStatus } from '@prisma/client'

const prisma = new PrismaClient()

// CSV预览数据验证Schema
const csvImportSchema = z.object({
  name: z.string().min(1, '会议室名称不能为空'),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1, '容量必须大于0'),
  location: z.string().optional(),
  equipment: z.string().optional(), // JSON字符串
  images: z.string().optional(), // JSON字符串
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
  rules: z.string().optional(), // JSON字符串
  requiresApproval: z.coerce.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  try {
    // 权限验证 - 需要会议室创建权限
    await requirePermission(event, 'room:create')

    // 只支持 POST 请求
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // 获取上传的文件
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      return createErrorResponse('没有上传文件', 400)
    }

    const file = formData.find(item => item.name === 'file' && item.filename?.endsWith('.csv'))
    if (!file) {
      return createErrorResponse('请上传CSV文件', 400)
    }

    // 解析CSV数据
    const csvContent = file.data.toString('utf-8')
    let parsedData
    try {
      parsedData = parseCSV(csvContent)
    } catch (parseError) {
      return createErrorResponse('CSV文件解析失败: ' + parseError.message, 400)
    }

    if (!parsedData || parsedData.length === 0) {
      return createErrorResponse('CSV文件中没有数据', 400)
    }

    // 验证CSV数据
    const validationResults = await validateCSVData(parsedData, csvImportSchema, prisma)

    // 准备预览数据（只返回前10行）
    const previewData = validationResults.validRows.slice(0, 10).map(row => ({
      name: row.name,
      description: row.description || '',
      capacity: row.capacity,
      location: row.location || '',
      status: row.status,
      requiresApproval: row.requiresApproval
    }))

    return createSuccessResponse({
      message: 'CSV预览数据生成成功',
      previewData,
      validData: validationResults.validRows,
      errors: validationResults.errors,
      totalRows: parsedData.length,
      validRows: validationResults.validRows.length,
      errorRows: validationResults.errors.length
    })

  } catch (error) {
    console.error('CSV预览错误:', error)

    if (error.statusCode === 401 || error.statusCode === 403) {
      return createErrorResponse('权限验证失败', error.statusCode)
    }

    return createErrorResponse('服务器内部错误', 500)
  } finally {
    await prisma.$disconnect()
  }
})