/**
 * 更新会议室信息 API
 * PUT /api/v1/rooms/:id
 */

import prisma from '~~/server/services/database'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { RoomIdSchema, UpdateRoomSchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:update 权限
  await requirePermission('room:update')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id
  try {
    // 验证请求参数
    const { id } = await getValidatedRouterParams(event, RoomIdSchema.parse)
    const updateData = await readValidatedBody(event, UpdateRoomSchema.parse)

    // 检查会议室是否存在
    const existingRoom = await prisma.meetingRoom.findFirst({
      where: {
        id,
        deletedAt: null
      }
    })

    if (!existingRoom) {
      return createErrorResponse(API_CODES.ROOM_NOT_FOUND, '会议室不存在')
    }

    // 如果更新名称，检查是否与其他会议室重复
    if (updateData.name && updateData.name !== existingRoom.name) {
      const duplicateRoom = await prisma.meetingRoom.findFirst({
        where: {
          name: updateData.name,
          deletedAt: null,
          id: {
            not: id
          }
        }
      })

      if (duplicateRoom) {
        return createErrorResponse(API_CODES.ROOM_ALREADY_EXISTS, '会议室名称已存在')
      }
    }

    // 记录变更历史（只记录实际变更的字段）
    const changes: any = {}
    const oldValue: any = {}
    const newValue: any = {}

    for (const [key, value] of Object.entries(updateData)) {
      if (JSON.stringify(existingRoom[key as keyof typeof existingRoom]) !== JSON.stringify(value)) {
        changes[key] = true
        oldValue[key] = existingRoom[key as keyof typeof existingRoom]
        newValue[key] = value
      }
    }

    // 更新会议室信息
    const updatedRoom = await prisma.meetingRoom.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    // 如果有变更，记录操作历史
    if (Object.keys(changes).length > 0) {
      await prisma.roomHistory.createMany({
        data: Object.keys(changes).map(field => ({
          roomId: id,
          action: 'UPDATE',
          field,
          oldValue: oldValue[field],
          newValue: newValue[field],
          userId: userId,
          ipAddress: getClientIP(event) || undefined,
          userAgent: getHeader(event, 'user-agent') || undefined
        }))
      })
    }

    return createSuccessResponse(updatedRoom, '会议室信息更新成功')

  } catch (error: any) {
    console.error('更新会议室失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求数据验证失败', error.errors)
    }

    // 数据库唯一约束错误
    if (error.code === 'P2002') {
      return createErrorResponse(API_CODES.ROOM_ALREADY_EXISTS, '会议室名称已存在')
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '更新会议室失败')
  } finally {
    await prisma.$disconnect()
  }
})