import prisma from '~~/server/services/database'
import { requirePermission } from '~~/server/middleware/permission'
import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'



export default defineEventHandler(async (event) => {
  try {
    // 权限验证 - 需要会议室读取权限
    await requirePermission('room:read')(event)

    // 只支持 GET 请求
    if (event.node.req.method !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const {
      roomId,
      page = '0',
      pageSize = '20'
    } = query

    if (!roomId) {
      return createErrorResponse(API_CODES.BAD_REQUEST, '缺少会议室ID')
    }

    const pageNum = parseInt(page as string)
    const size = parseInt(pageSize as string)
    const skip = pageNum * size

    // 构建查询条件
    const where: any = {
      roomId: roomId as string
    }

    // 查询操作历史
    const [history, total] = await Promise.all([
      prisma.roomHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          room: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        skip,
        take: size
      }),
      prisma.roomHistory.count({ where })
    ])

    // 计算是否有更多数据
    const hasMore = skip + history.length < total

    return createSuccessResponse({
      history,
      total,
      hasMore,
      page: pageNum,
      pageSize: size
    })

  } catch (error) {
    console.error('获取操作历史失败:', error)

    if (error.statusCode === 401 || error.statusCode === 403) {
      return createErrorResponse(API_CODES.FORBIDDEN, '权限验证失败')
    }

    return createErrorResponse(API_CODES.INTERNAL_ERROR, '服务器内部错误')
  } finally {
    await prisma.$disconnect()
  }
})