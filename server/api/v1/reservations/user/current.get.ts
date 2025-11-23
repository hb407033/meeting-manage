/**
 * 获取用户当前和即将开始的预约
 * GET /api/v1/reservations/user/current
 */
import prisma from '~~/server/services/database'
import { getCurrentUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 获取认证用户信息
    const user = await getCurrentUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权访问'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const userId = query.userId as string || user.id

    // 权限检查：用户只能查看自己的预约，管理员可以查看所有用户的预约
    if (userId !== user.id && user.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: '权限不足，无法查看其他用户的预约'
      })
    }

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // 查询用户当前和即将开始的预约
    const reservations = await prisma.reservation.findMany({
      where: {
        organizerId: userId,
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        },
        OR: [
          {
            // 当前进行中的预约
            startTime: { lte: now },
            endTime: { gt: now }
          },
          {
            // 即将开始的预约（未来24小时内）
            startTime: { gt: now, lte: tomorrow }
          }
        ]
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 20 // 限制返回数量
    })

    return {
      success: true,
      data: reservations,
      count: reservations.length,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('获取用户预约失败:', error)

    // 如果是已知的错误，直接抛出
    if (error.statusCode) {
      throw error
    }

    // 未知错误
    throw createError({
      statusCode: 500,
      statusMessage: '获取用户预约失败'
    })
  }
})

