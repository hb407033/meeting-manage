/**
 * 获取会议室列表 API
 * GET /api/v1/rooms
 */

import { PrismaClient } from '@prisma/client'
import { createPaginatedResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { RoomQuerySchema } from '~~/server/schemas/room'
import { requirePermission } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:read 权限
  // 用户认证现在由通用中间件 server/middleware/api-auth.ts 处理
  await requirePermission('room:read')(event)
  try {
    // 验证查询参数
    const query = await getValidatedQuery(event, RoomQuerySchema.parse)

    // 构建查询条件
    const where: any = {
      deletedAt: null // 只查询未删除的会议室
    }

    // 状态筛选
    if (query.status) {
      where.status = query.status
    }

    // 位置筛选
    if (query.location) {
      where.location = {
        contains: query.location,
        mode: 'insensitive'
      }
    }

    // 容量范围筛选
    if (query.capacityMin || query.capacityMax) {
      where.capacity = {}
      if (query.capacityMin) {
        where.capacity.gte = query.capacityMin
      }
      if (query.capacityMax) {
        where.capacity.lte = query.capacityMax
      }
    }

    // 搜索关键词（搜索名称和描述）
    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          location: {
            contains: query.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // 设备筛选
    if (query.equipment) {
      Object.entries(query.equipment).forEach(([key, value]) => {
        if (value !== undefined) {
          where.AND = where.AND || []
          where.AND.push({
            equipment: {
              path: [key],
              equals: value
            }
          })
        }
      })
    }

    // 计算分页参数
    const skip = (query.page - 1) * query.limit

    // 查询总数和数据
    const [total, rooms] = await Promise.all([
      prisma.meetingRoom.count({ where }),
      prisma.meetingRoom.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          [query.sortBy]: query.sortOrder
        },
        include: {
          // 包含关联的预约数量统计
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
          }
        }
      })
    ])

    // 计算分页元信息
    const totalPages = Math.ceil(total / query.limit)
    const meta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1
    }

    return createPaginatedResponse(rooms, meta, '会议室列表查询成功')

  } catch (error: any) {
    console.error('获取会议室列表失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求参数验证失败', error.errors)
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '获取会议室列表失败')
  } finally {
    await prisma.$disconnect()
  }
})