import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requirePermission } from '~~/server/middleware/permission'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { parseCSV, validateCSVData, generateCSVTemplate } from '~~/server/utils/csv'
import { RoomStatus } from '@prisma/client'
import { createAuditLog } from '~~/server/utils/audit'

const prisma = new PrismaClient()

// CSV导入数据验证Schema
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
    const user = await requirePermission(event, 'room:create')

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
    if (!validationResults.isValid) {
      return createErrorResponse('数据验证失败', 400, {
        errors: validationResults.errors,
        validRows: validationResults.validRows,
        totalRows: parsedData.length
      })
    }

    // 批量创建会议室
    const createdRooms = []
    const errors = []

    for (let i = 0; i < validationResults.validRows.length; i++) {
      try {
        const roomData = validationResults.validRows[i]

        // 解析JSON字段
        const equipment = roomData.equipment ? JSON.parse(roomData.equipment) : null
        const images = roomData.images ? JSON.parse(roomData.images) : null
        const rules = roomData.rules ? JSON.parse(roomData.rules) : null

        const room = await prisma.meetingRoom.create({
          data: {
            name: roomData.name,
            description: roomData.description,
            capacity: roomData.capacity,
            location: roomData.location,
            equipment,
            images,
            status: roomData.status,
            rules,
            requiresApproval: roomData.requiresApproval
          }
        })

        createdRooms.push({
          row: i + 2, // +2 因为CSV行号从1开始，且标题行占1行
          id: room.id,
          name: room.name
        })

        // 记录操作日志
        await createAuditLog({
          userId: user.id,
          action: 'BATCH_IMPORT',
          resourceType: 'ROOM',
          resourceId: room.id,
          details: {
            method: 'CSV_IMPORT',
            fileName: file.filename,
            rowIndex: i + 2,
            roomName: room.name
          },
          ipAddress: getClientIP(event),
          userAgent: getHeader(event, 'user-agent')
        })

      } catch (error) {
        errors.push({
          row: i + 2,
          data: validationResults.validRows[i],
          error: error.message
        })
      }
    }

    // 创建批量操作历史记录
    if (createdRooms.length > 0) {
      await prisma.roomHistory.create({
        data: {
          roomId: createdRooms[0].id, // 使用第一个创建的会议室ID
          action: 'BATCH_IMPORT',
          newValue: {
            importedCount: createdRooms.length,
            totalCount: parsedData.length,
            errorCount: errors.length,
            fileName: file.filename,
            timestamp: new Date().toISOString()
          },
          userId: user.id,
          ipAddress: getClientIP(event),
          userAgent: getHeader(event, 'user-agent')
        }
      })
    }

    return createSuccessResponse({
      message: 'CSV导入完成',
      summary: {
        totalRows: parsedData.length,
        successCount: createdRooms.length,
        errorCount: errors.length
      },
      createdRooms,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('CSV导入错误:', error)

    if (error.statusCode === 401 || error.statusCode === 403) {
      return createErrorResponse('权限验证失败', error.statusCode)
    }

    return createErrorResponse('服务器内部错误', 500)
  } finally {
    await prisma.$disconnect()
  }
})