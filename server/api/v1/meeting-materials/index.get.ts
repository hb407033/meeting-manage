/**
 * 获取会议材料列表 API
 * GET /api/v1/meeting-materials
 */

import prisma from '~~/server/services/database'
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  API_CODES,
  getClientIP
} from '~~/server/utils/response'
import type { MaterialListResponse, MaterialSearchParams } from '~~/server/types/meeting'

export default defineEventHandler(async (event) => {
  // 权限验证：需要 reservation:view 权限
  await requirePermission('reservation:view')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id

  if (!userId) {
    return createErrorResponse('UNAUTHORIZED', '用户未认证')
  }

  try {
    // 获取查询参数
    const query = getQuery(event) as MaterialSearchParams

    const {
      page = 1,
      limit = 20,
      query: searchQuery,
      type,
      uploadedBy,
      dateFrom,
      dateTo,
      reservationId,
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = query

    const offset = (Number(page) - 1) * Number(limit)

    // 构建查询条件
    const whereConditions: any = {
      deletedAt: null
    }

    // 搜索条件
    if (searchQuery) {
      whereConditions.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { originalName: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }

    // 文件类型筛选
    if (type) {
      whereConditions.type = type
    }

    // 上传者筛选
    if (uploadedBy) {
      whereConditions.uploadedBy = { contains: uploadedBy, mode: 'insensitive' }
    }

    // 预约ID筛选
    if (reservationId) {
      whereConditions.reservationId = reservationId
    }

    // 日期范围筛选
    if (dateFrom || dateTo) {
      whereConditions.uploadedAt = {}
      if (dateFrom) {
        whereConditions.uploadedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereConditions.uploadedAt.lte = new Date(dateTo)
      }
    }

    // 权限控制：只能看到自己的材料或公开材料，除非有管理权限
    const hasManagePermission = await hasPermission('reservation:manage', event)
    if (!hasManagePermission) {
      whereConditions.OR = [
        { userId: userId },
        { isPublic: true }
      ]
    }

    // 排序配置
    const orderBy: any = {}
    orderBy[sortBy as string] = sortOrder

    // 获取总数
    const total = await prisma.meetingMaterial.count({
      where: whereConditions
    })

    // 获取材料列表
    const materials = await prisma.meetingMaterial.findMany({
      where: whereConditions,
      orderBy,
      skip: offset,
      take: Number(limit),
      include: {
        reservation: {
          select: {
            id: true,
            title: true,
            startTime: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 获取统计信息
    const stats = await getMaterialStats(userId, hasManagePermission)

    // 转换数据格式
    const materialList = materials.map(material => ({
      id: material.id,
      name: material.name,
      originalName: material.originalName,
      type: material.type,
      size: material.size,
      url: material.url,
      uploadedBy: material.uploadedBy,
      uploadedAt: material.uploadedAt.toISOString(),
      reservationId: material.reservationId || undefined,
      description: material.description || undefined,
      isPublic: material.isPublic,
      reservation: material.reservation,
      user: material.user
    }))

    // 构建分页响应
    const response: MaterialListResponse = {
      items: materialList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      stats
    }

    return createPaginatedResponse(
      materialList,
      total,
      Number(page),
      Number(limit),
      '获取会议材料列表成功'
    )

  } catch (error: any) {
    console.error('获取会议材料列表失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '获取会议材料列表失败')
  } finally {
    await prisma.$disconnect()
  }
})

/**
 * 获取材料统计信息
 */
async function getMaterialStats(userId: string, hasManagePermission: boolean) {
  const whereCondition = hasManagePermission
    ? { deletedAt: null }
    : {
        deletedAt: null,
        OR: [
          { userId: userId },
          { isPublic: true }
        ]
      }

  // 总数量和总大小
  const totalResult = await prisma.meetingMaterial.aggregate({
    where: whereCondition,
    _count: { id: true },
    _sum: { size: true }
  })

  // 类型分布
  const typeDistribution = await prisma.meetingMaterial.groupBy({
    by: ['type'],
    where: whereCondition,
    _count: { type: true },
    orderBy: { _count: { type: 'desc' } }
  })

  // 上传趋势（最近30天）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const uploadTrend = await prisma.meetingMaterial.groupBy({
    by: ['uploadedAt'],
    where: {
      ...whereCondition,
      uploadedAt: {
        gte: thirtyDaysAgo
      }
    },
    _count: { id: true },
    _sum: { size: true }
  })

  // 按日期分组统计
  const dailyStats = new Map<string, { count: number; size: number }>()

  uploadTrend.forEach(item => {
    const date = item.uploadedAt.toISOString().split('T')[0]
    const existing = dailyStats.get(date) || { count: 0, size: 0 }
    dailyStats.set(date, {
      count: existing.count + item._count.id,
      size: existing.size + (item._sum.size || 0)
    })
  })

  return {
    totalCount: totalResult._count.id,
    totalSize: totalResult._sum.size || 0,
    typeDistribution: typeDistribution.reduce((acc, item) => {
      acc[item.type] = item._count.type
      return acc
    }, {} as Record<string, number>),
    uploadTrend: Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      count: stats.count,
      size: stats.size
    })).sort((a, b) => a.date.localeCompare(b.date))
  }
}