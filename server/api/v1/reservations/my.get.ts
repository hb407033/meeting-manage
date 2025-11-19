import { PrismaClient } from '@prisma/client'
import { createSuccessResponse, createErrorResponse } from '../../../utils/response'
import { getCurrentUser } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // 获取当前认证用户
    const currentUser = await getCurrentUser(event)

    if (!currentUser) {
      return createErrorResponse('未登录或登录已过期', 401)
    }

    console.log(`🔍 获取用户 ${currentUser.email} 的预约列表`)

    // 获取查询参数
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50
    const status = query.status as string
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    const skip = (page - 1) * limit

    // 构建查询条件
    const whereCondition: any = {
      organizerId: currentUser.id
    }

    // 添加状态筛选
    if (status) {
      whereCondition.status = status
    }

    // 添加日期范围筛选
    if (startDate || endDate) {
      whereCondition.startTime = {}
      if (startDate) {
        whereCondition.startTime.gte = new Date(startDate)
      }
      if (endDate) {
        whereCondition.startTime.lte = new Date(endDate)
      }
    }

    // 获取预约总数
    const total = await prisma.reservation.count({
      where: whereCondition
    })

    // 获取预约列表
    const reservations = await prisma.reservation.findMany({
      where: whereCondition,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
            equipment: true
          }
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      skip,
      take: limit
    })

    // 格式化预约数据
    const formattedReservations = reservations.map(reservation => ({
      ...reservation,
      attendees: reservation.attendees ? JSON.parse(reservation.attendees as string) : [],
      materials: reservation.materials ? JSON.parse(reservation.materials as string) : [],
      recurrenceRule: reservation.recurrenceRule ? JSON.parse(reservation.recurrenceRule as string) : null,
      organizerName: reservation.organizer?.name || '',
      organizerEmail: reservation.organizer?.email || '',
      roomName: reservation.room?.name || '',
      roomLocation: reservation.room?.location || ''
    }))

    console.log(`✅ 找到 ${total} 个预约记录，当前页返回 ${formattedReservations.length} 个`)

    return createSuccessResponse({
      reservations: formattedReservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      summary: {
        total,
        upcoming: reservations.filter(r => new Date(r.startTime) > new Date()).length,
        past: reservations.filter(r => new Date(r.startTime) <= new Date()).length,
        pending: reservations.filter(r => r.status === 'PENDING').length,
        confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
        cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
        completed: reservations.filter(r => r.status === 'COMPLETED').length
      }
    }, '获取我的预约列表成功')

  } catch (error: any) {
    console.error('❌ 获取我的预约列表失败:', error)

    if (error.message?.includes('Unauthorized') || error.message?.includes('Token')) {
      return createErrorResponse('认证失败，请重新登录', 401)
    }

    return createErrorResponse('获取预约列表失败', 500)
  }
})