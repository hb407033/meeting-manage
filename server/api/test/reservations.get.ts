import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 调试：查询预约列表数据')

    // 查询预约列表（无认证限制，仅用于调试）
    const reservations = await Prisma.reservation.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // 限制数量以避免过多数据
    })

    console.log(`📋 调试：找到 ${reservations.length} 条预约记录`)

    // 构建分页信息
    const pagination = {
      page: 1,
      limit: 10,
      total: reservations.length,
      totalPages: Math.ceil(reservations.length / 10),
      hasNext: false,
      hasPrev: false
    }

    const response = {
      reservations,
      pagination
    }

    console.log('📊 调试：响应数据结构:', {
      hasReservations: Array.isArray(response.reservations),
      reservationsCount: response.reservations.length,
      hasPagination: !!response.pagination,
      firstReservation: response.reservations[0] ? {
        id: response.reservations[0].id,
        title: response.reservations[0].title,
        hasOrganizer: !!response.reservations[0].organizer,
        hasRoom: !!response.reservations[0].room
      } : null
    })

    return createSuccessResponse(response, '调试查询成功')

  } catch (error) {
    console.error('❌ 调试查询预约列表失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '查询失败: ' + error.message)
  }
})