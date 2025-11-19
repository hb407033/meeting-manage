/**
 * 获取周期性预约列表
 * GET /api/v1/reservations/recurring
 */

import RecurringReservationService from '~~/server/services/recurring-reservation-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { getCurrentUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 获取当前用户
    const user = await getCurrentUser(event)
    if (!user?.id) {
      return createErrorResponse('UNAUTHORIZED', '请先登录')
    }

    const query = getQuery(event)

    // 解析查询参数
    const filters = {
      organizerId: query.organizerId as string || user.id,
      roomId: query.roomId as string,
      status: query.status as any,
      search: query.search as string,
      page: parseInt(query.page as string) || 1,
      limit: Math.min(parseInt(query.limit as string) || 20, 100) // 限制最大100条
    }

    // 获取周期性预约列表
    const result = await RecurringReservationService.getRecurringReservations(filters)

    return createSuccessResponse(result, 'FETCH_SUCCESS', '获取周期性预约列表成功')
  } catch (error: any) {
    console.error('获取周期性预约列表失败:', error)
    return createErrorResponse('FETCH_FAILED', error.message || '获取周期性预约列表失败')
  }
})