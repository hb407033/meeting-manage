/**
 * 创建新会议室 API
 * POST /api/v1/rooms
 */

import prisma from '~~/server/services/database'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { CreateRoomSchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  debugger // 调试断点：检查API入口

  // 权限验证：需要 room:create 权限
  await requirePermission('room:create')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id

  console.log('🔍 Debug - 用户信息:', { user: event.context.user, userId })

  try {
    console.log('🔍 Debug - 开始处理请求')

    // 验证请求体
    const body = await readValidatedBody(event, CreateRoomSchema.parse)
    console.log('🔍 Debug - 请求数据:', body)

    debugger // 调试断点：检查数据库查询前

    // 检查会议室名称是否已存在
    const existingRoom = await prisma.meetingRoom.findFirst({
      where: {
        name: body.name,
        deletedAt: null
      }
    })

    console.log('🔍 Debug - 现有会议室检查结果:', existingRoom)

    if (existingRoom) {
      console.log('🔍 Debug - 会议室已存在，返回错误')
      return createErrorResponse(API_CODES.DUPLICATE_RESOURCE, '会议室名称已存在')
    }

    // 创建会议室
    const room = await prisma.meetingRoom.create({
      data: {
        name: body.name,
        description: body.description,
        capacity: body.capacity,
        location: body.location,
        equipment: body.equipment,
        images: body.images,
        rules: body.rules,
        requiresApproval: body.requiresApproval || false,
        status: body.status || 'AVAILABLE'
      }
    })

    // 记录操作历史
    await prisma.roomHistory.create({
      data: {
        roomId: room.id,
        action: 'CREATE',
        newValue: room,
        userId: userId,
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    return createSuccessResponse(room, '会议室创建成功')

  } catch (error: any) {
    console.error('创建会议室失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求数据验证失败', error.errors)
    }

    // 数据库唯一约束错误
    if (error.code === 'P2002') {
      return createErrorResponse(API_CODES.DUPLICATE_RESOURCE, '会议室名称已存在')
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '创建会议室失败')
  } finally {
    await prisma.$disconnect()
  }
})