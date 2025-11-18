/**
 * 会议室搜索 API
 * POST /api/v1/rooms/search
 * 基于数据库的搜索API，支持模糊查询和复杂筛选条件
 */

import { PrismaClient } from '@prisma/client'
import { createPaginatedResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { z } from 'zod'
import { requirePermission } from '~~/server/middleware/permission'

const prisma = new PrismaClient()

// 搜索请求体 schema
const SearchRoomSchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词不能超过100个字符'),
  filters: z.object({
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'DISABLED']).optional(),
    capacityMin: z.number().min(1, '最小容量必须大于0').max(1000).optional(),
    capacityMax: z.number().min(1, '最大容量不能超过1000').max(1000).optional(),
    location: z.string().max(100, '位置筛选不能超过100个字符').optional(),
    equipment: z.object({
      projector: z.boolean().optional(),
      whiteboard: z.boolean().optional(),
      videoConf: z.boolean().optional(),
      airCondition: z.boolean().optional(),
      wifi: z.boolean().optional()
    }).optional()
  }).optional(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20)
  }).optional(),
  sort: z.object({
    sortBy: z.enum(['name', 'capacity', 'location', 'createdAt', 'updatedAt']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }).optional()
})

export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:read 权限
  await requirePermission('room:read')(event)

  try {
    // 验证请求体
    const body = await readBody(event)
    const validatedData = SearchRoomSchema.parse(body)

    const { keyword, filters, pagination, sort } = validatedData
    const page = pagination?.page || 1
    const limit = pagination?.limit || 20
    const sortBy = sort?.sortBy || 'name'
    const sortOrder = sort?.sortOrder || 'asc'

    // 构建查询条件
    const where: any = {
      deletedAt: null, // 只查询未删除的会议室
      OR: [
        // 名称模糊查询
        {
          name: {
            contains: keyword,
            mode: 'insensitive'
          }
        },
        // 位置模糊查询
        {
          location: {
            contains: keyword,
            mode: 'insensitive'
          }
        },
        // 描述模糊查询
        {
          description: {
            contains: keyword,
            mode: 'insensitive'
          }
        }
      ]
    }

    // 添加筛选条件
    if (filters) {
      // 状态筛选
      if (filters.status) {
        where.AND = where.AND || []
        where.AND.push({
          status: filters.status
        })
      }

      // 容量范围筛选
      if (filters.capacityMin || filters.capacityMax) {
        where.AND = where.AND || []
        const capacityCondition: any = {}
        if (filters.capacityMin) {
          capacityCondition.gte = filters.capacityMin
        }
        if (filters.capacityMax) {
          capacityCondition.lte = filters.capacityMax
        }
        where.AND.push({
          capacity: capacityCondition
        })
      }

      // 位置筛选
      if (filters.location) {
        where.AND = where.AND || []
        where.AND.push({
          location: {
            contains: filters.location,
            mode: 'insensitive'
          }
        })
      }

      // 设备筛选 (查询 JSON 字段)
      if (filters.equipment) {
        where.AND = where.AND || []
        Object.entries(filters.equipment).forEach(([key, value]) => {
          if (value !== undefined) {
            where.AND.push({
              equipment: {
                path: [key],
                equals: value
              }
            })
          }
        })
      }
    }

    // 计算分页参数
    const skip = (page - 1) * limit

    // 查询总数和数据
    const [total, rooms] = await Promise.all([
      prisma.meetingRoom.count({ where }),
      prisma.meetingRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
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
    const totalPages = Math.ceil(total / limit)
    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      searchKeyword: keyword,
      filters: filters || {},
      sort: {
        sortBy,
        sortOrder
      }
    }

    return createPaginatedResponse(rooms, meta, '会议室搜索成功')

  } catch (error: any) {
    console.error('会议室搜索失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse(API_CODES.VALIDATION_ERROR, '请求参数验证失败', error.errors)
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '会议室搜索失败')
  } finally {
    await prisma.$disconnect()
  }
})