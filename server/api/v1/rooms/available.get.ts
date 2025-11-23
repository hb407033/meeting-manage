/**
 * 查找可用会议室
 * GET /api/v1/rooms/available
 */
import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 获取认证用户信息
    const user = await getUserFromEvent(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const startTime = query.startTime as string
    const endTime = query.endTime as string
    const capacity = parseInt(query.capacity as string) || undefined
    const location = query.location as string
    const limit = parseInt(query.limit as string) || 10

    // 参数验证
    if (!startTime || !endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: '开始时间和结束时间不能为空'
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须晚于开始时间'
      })
    }

    // 查询所有可用的会议室
    const availableRooms = await prisma.meetingRoom.findMany({
      where: {
        status: 'AVAILABLE'
      }
    })

    // 查询时间段内有预约的会议室
    const bookedRooms = await prisma.reservation.findMany({
      where: {
        status: {
          in: ['CONFIRMED']
        },
        startTime: { lt: end },
        endTime: { gt: start }
      },
      select: {
        roomId: true
      }
    })

    // 获取被占用的会议室ID集合
    const bookedRoomIds = new Set(bookedRooms.map(r => r.roomId))

    // 过滤出可用的会议室
    let rooms = availableRooms.filter(room => !bookedRoomIds.has(room.id))

    // 应用额外的筛选条件
    if (capacity) {
      rooms = rooms.filter(room => room.capacity >= capacity)
    }

    if (location) {
      rooms = rooms.filter(room =>
        room.location?.toLowerCase().includes(location.toLowerCase())
      )
    }

    // 限制返回数量
    rooms = rooms.slice(0, limit)

    // 为每个房间添加推荐分数
    const roomsWithScore = rooms.map(room => {
      let score = 100

      // 容量匹配度（容量接近需求的分数更高）
      if (capacity) {
        const capacityDiff = Math.abs(room.capacity - capacity)
        if (capacityDiff === 0) score += 20
        else if (capacityDiff <= 2) score += 10
        else if (capacityDiff <= 5) score += 5
      }

      // 设备完整性
      if (room.equipment && room.equipment.length > 0) {
        score += 10
      }

      return {
        ...room,
        recommendationScore: score,
        recommendationReason: getRecommendationReason(room, capacity, location)
      }
    })

    // 按推荐分数排序
    roomsWithScore.sort((a, b) => b.recommendationScore - a.recommendationScore)

    return {
      success: true,
      data: roomsWithScore,
      count: roomsWithScore.length,
      searchCriteria: {
        startTime,
        endTime,
        capacity,
        location
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('查找可用会议室失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '查找可用会议室失败'
    })
  }
})

/**
 * 生成推荐理由
 */
function getRecommendationReason(room: any, capacity?: number, location?: string): string {
  const reasons = []

  if (capacity) {
    const capacityDiff = Math.abs(room.capacity - capacity)
    if (capacityDiff === 0) {
      reasons.push('容量完美匹配')
    } else if (capacityDiff <= 2) {
      reasons.push('容量合适')
    } else if (room.capacity > capacity + 5) {
      reasons.push('空间充裕')
    }
  }

  if (location && room.location?.toLowerCase().includes(location.toLowerCase())) {
    reasons.push('位置匹配')
  }

  if (room.equipment && room.equipment.length > 0) {
    reasons.push('设备齐全')
  }

  if (reasons.length === 0) {
    reasons.push('满足基本需求')
  }

  return reasons.join('，')
}

/**
 * 从事件中获取用户信息
 */
async function getUserFromEvent(event: any) {
  try {
    // 这里需要根据实际的认证机制来实现
    // 暂时返回模拟用户
    return {
      id: '1',
      email: 'user@example.com',
      role: 'USER'
    }
  } catch (error) {
    return null
  }
}