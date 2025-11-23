import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getCurrentUser(event)

    // 获取路由参数
    const reservationId = getRouterParam(event, 'id')
    if (!reservationId) {
      return createErrorResponse('BAD_REQUEST', '预约ID是必需的')
    }

    // 查找预约详情
    const reservation = await Prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            status: true,
            equipment: true,
            description: true
          }
        },
        meetingMaterials: {
          select: {
            id: true,
            name: true,
            originalName: true,
            size: true,
            type: true,
            uploadedAt: true,
            url: true
          }
        },
        recurringReservation: {
          select: {
            id: true,
            title: true,
            recurrenceRule: true,
            endCondition: true,
            endCount: true,
            endDate: true,
            status: true
          }
        }
      }
    })

    if (!reservation) {
      return createErrorResponse('NOT_FOUND', '预约不存在')
    }

    // 权限检查：只有预约组织者、管理员或会议室管理员可以查看预约详情
    // 这里简化处理，假设预约组织者可以查看自己的预约
    // 实际项目中可能需要更复杂的权限控制
    const isOrganizer = reservation.organizerId === user.id
    const isAdmin = user.role === 'ADMIN'
    const isRoomAdmin = user.role === 'ROOM_ADMIN'

    if (!isOrganizer && !isAdmin && !isRoomAdmin) {
      return createErrorResponse('FORBIDDEN', '没有权限查看此预约详情')
    }

    // 构建响应数据
    const responseData = {
      id: reservation.id,
      title: reservation.title,
      description: reservation.description,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
      importanceLevel: reservation.importanceLevel,
      attendeeCount: reservation.attendeeCount,
      budgetAmount: reservation.budgetAmount,
      specialRequirements: reservation.specialRequirements,
      equipment: reservation.equipment,
      services: reservation.services,
      attendeeList: reservation.attendeeList,
      isRecurring: reservation.isRecurring,
      recurringPattern: reservation.recurringPattern,
      isException: reservation.isException,
      recurringReservation: reservation.recurringReservation,
      meetingMaterials: reservation.meetingMaterials,
      organizer: reservation.organizer,
      room: reservation.room,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }

    console.log(`✅ 获取预约详情成功: ${reservationId}`)

    return createSuccessResponse(responseData, '预约详情获取成功')

  } catch (error) {
    console.error('❌ 获取预约详情失败:', error)

    if (error instanceof Error) {
      return createErrorResponse('INTERNAL_ERROR', error.message)
    }

    return createErrorResponse('INTERNAL_ERROR', '获取预约详情失败')
  }
})