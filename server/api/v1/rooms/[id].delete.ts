/**
 * 删除会议室 API（软删除）
 * DELETE /api/v1/rooms/:id
 */

import prisma from '~~/server/services/database'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { RoomIdSchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:delete 权限
  await requirePermission('room:delete')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id
  try {
    // 验证请求参数
    const { id } = await getValidatedRouterParams(event, RoomIdSchema.parse)

    // 检查会议室是否存在
    const existingRoom = await prisma.meetingRoom.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            reservations: {
              where: {
                status: {
                  in: ['PENDING', 'CONFIRMED']
                }
              }
            }
          }
        }
      }
    })

    if (!existingRoom) {
      return createErrorResponse(API_CODES.ROOM_NOT_FOUND, '会议室不存在')
    }

    // 检查是否有未完成的预约
    if (existingRoom._count.reservations > 0) {
      return createErrorResponse(API_CODES.ROOM_IN_USE, '会议室有未完成的预约，无法删除')
    }

    // 执行软删除
    const deletedRoom = await prisma.meetingRoom.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })

    // 记录操作历史
    await prisma.roomHistory.create({
      data: {
        roomId: id,
        action: 'DELETE',
        oldValue: existingRoom,
        newValue: { deletedAt: deletedRoom.deletedAt },
        userId: userId,
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    return createSuccessResponse(
      { id: deletedRoom.id, deleted: true },
      '会议室删除成功'
    )

  } catch (error: any) {
    console.error('删除会议室失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求参数验证失败', error.errors)
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '删除会议室失败')
  } finally {
    await prisma.$disconnect()
  }
})