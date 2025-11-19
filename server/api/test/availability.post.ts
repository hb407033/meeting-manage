import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 调试：查询会议室可用性')

    // 获取请求体
    const body = await readBody(event)

    // 验证请求参数
    if (!body.roomIds || !Array.isArray(body.roomIds) || body.roomIds.length === 0) {
      return createErrorResponse('BAD_REQUEST', 'roomIds 参数是必需的')
    }

    if (!body.startTime || !body.endTime) {
      return createErrorResponse('BAD_REQUEST', 'startTime 和 endTime 参数是必需的')
    }

    const startTime = new Date(body.startTime as string)
    const endTime = new Date(body.endTime as string)

    // 获取会议室信息
    const rooms = await Prisma.meetingRoom.findMany({
      where: {
        id: { in: body.roomIds }
      }
    })

    console.log(`📋 调试：找到 ${rooms.length} 个会议室`)

    // 构建响应
    const response: any = {}

    for (const room of rooms) {
      // 模拟预约数据（从真实数据库获取）
      const reservations = await Prisma.reservation.findMany({
        where: {
          roomId: room.id,
          startTime: { lte: endTime },
          endTime: { gte: startTime },
          status: { not: 'CANCELED' }
        },
        include: {
          organizer: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      console.log(`📋 调试：会议室 ${room.name} 有 ${reservations.length} 个预约`)

      // 使用原始的可用性计算逻辑（按需要生成大的时间段）
      const availableSlots = []
      const currentTime = new Date(startTime)

      if (room.status === 'AVAILABLE' && reservations.length === 0) {
        // 如果没有预约，会议室可用，生成几个示例时间段
        const slotDuration = 30 * 60 * 1000 // 30分钟
        for (let i = 0; i < 5; i++) {
          const slotStart = new Date(currentTime.getTime() + i * slotDuration)
          const slotEnd = new Date(slotStart.getTime() + slotDuration)

          if (slotEnd <= endTime) {
            availableSlots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              duration: 30
            })
          }
        }
      }

      response[room.id] = {
        roomId: room.id,
        roomName: room.name,
        status: room.status === 'AVAILABLE' && availableSlots.length > 0 ? 'available' : 'unavailable',
        availableSlots,
        reservations: reservations.map(r => ({
          id: r.id,
          title: r.title,
          startTime: r.startTime.toISOString(),
          endTime: r.endTime.toISOString(),
          organizerName: r.organizer?.name || '未知',
          status: r.status
        }))
      }
    }

    console.log('📊 调试：可用性响应数据结构:', {
      roomCount: Object.keys(response).length,
      firstRoomId: Object.keys(response)[0],
      hasData: Object.keys(response).length > 0
    })

    return createSuccessResponse(response, '调试查询成功')

  } catch (error) {
    console.error('❌ 调试查询可用性失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '查询失败: ' + error.message)
  }
})