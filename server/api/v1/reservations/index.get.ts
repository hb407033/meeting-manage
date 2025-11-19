import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'
import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getRequiredCurrentUser(event)

    // 获取查询参数
    const query = getQuery(event)

    const page = Math.max(1, parseInt((query.page as string) || '1'))
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || '20')))
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {}

    // 用户权限：普通用户只能查看自己的预约，管理员可以查看所有预约
    // 这里简化处理，假设所有用户都能查看所有预约（实际项目中应该根据权限控制）
    if (query.organizerId) {
      where.organizerId = query.organizerId as string
    }

    if (query.roomId) {
      where.roomId = query.roomId as string
    }

    if (query.status) {
      where.status = query.status as string
    }

    // 时间范围筛选
    if (query.startTimeFrom || query.startTimeTo) {
      where.startTime = {}
      if (query.startTimeFrom) {
        where.startTime.gte = new Date(query.startTimeFrom as string)
      }
      if (query.startTimeTo) {
        where.startTime.lte = new Date(query.startTimeTo as string)
      }
    }

    // 标题搜索
    if (query.search) {
      where.title = {
        contains: query.search as string,
        mode: 'insensitive'
      }
    }

    // 排序
    const orderBy: any = {}
    const sortBy = (query.sortBy as string) || 'createdAt'
    const sortOrder = (query.sortOrder as string) || 'desc'

    if (sortBy === 'startTime' || sortBy === 'endTime' || sortBy === 'createdAt') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc' // 默认排序
    }

    // 查询总数
    const total = await Prisma.reservation.count({ where })

    // 查询预约列表
    const reservations = await Prisma.reservation.findMany({
      where,
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
      orderBy,
      skip,
      take: limit
    })

    // 构建分页信息
    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }

    const response = {
      reservations,
      pagination
    }

    console.log(`📋 查询预约列表: 第${page}页，共${total}条记录`)

    return createSuccessResponse(response, '查询成功')

  } catch (error) {
    console.error('❌ 查询预约列表失败:', error)

    if (error instanceof Error) {
      return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, error.message)
    }

    return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, '查询预约列表失败')
  }
})