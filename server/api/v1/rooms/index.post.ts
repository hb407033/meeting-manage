/**
 * 创建新会议室 API
 * POST /api/v1/rooms
 */

import { PrismaClient } from '@prisma/client'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { CreateRoomSchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:create 权限
  await requirePermission('room:create')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id
  try {
    // 验证请求体
    const body = await readValidatedBody(event, CreateRoomSchema.parse)

    // 检查会议室名称是否已存在
    const existingRoom = await prisma.meetingRoom.findFirst({
      where: {
        name: body.name,
        deletedAt: null
      }
    })

    if (existingRoom) {
      return createErrorResponse(API_CODES.ROOM_ALREADY_EXISTS, '会议室名称已存在')
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
      return createErrorResponse(API_CODES.ROOM_ALREADY_EXISTS, '会议室名称已存在')
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '创建会议室失败')
  } finally {
    await prisma.$disconnect()
  }
})