/**
 * 获取单个会议室详情 API
 * GET /api/v1/rooms/:id
 */

import prisma from '~~/server/services/database'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { RoomIdSchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'



export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:read 权限
  // 用户认证现在由通用中间件 server/middleware/api-auth.ts 处理
  await requirePermission('room:read')(event)
  try {
    // 验证路径参数
    const { id } = await getValidatedRouterParams(event, RoomIdSchema.parse)

    // 查询会议室详情
    const room = await prisma.meetingRoom.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        // 包含预约统计
        _count: {
          select: {
            reservations: {
              where: {
                startTime: {
                  gte: new Date()
                }
              }
            }
          }
        },
        // 包含最近的操作历史
        roomHistory: {
          take: 10,
          orderBy: {
            timestamp: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!room) {
      return createErrorResponse(API_CODES.ROOM_NOT_FOUND, '会议室不存在')
    }

    return createSuccessResponse(room, '会议室详情查询成功')

  } catch (error: any) {
    console.error('获取会议室详情失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求参数验证失败', error.errors)
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '获取会议室详情失败')
  } finally {
    await prisma.$disconnect()
  }
})