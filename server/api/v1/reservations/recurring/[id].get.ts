/**
 * 获取周期性预约详情
 * GET /api/v1/reservations/recurring/[id]
 */

import RecurringReservationService from '~~/server/services/recurring-reservation-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      return createErrorResponse('VALIDATION_ERROR', '缺少预约ID')
    }

    const includeStats = getQuery(event).includeStats === 'true'

    const recurringReservation = await RecurringReservationService.getRecurringReservation(
      id,
      includeStats
    )

    if (!recurringReservation) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    return createSuccessResponse(recurringReservation, 'FETCH_SUCCESS', '获取周期性预约成功')
  } catch (error: any) {
    console.error('获取周期性预约失败:', error)
    return createErrorResponse('FETCH_FAILED', error.message || '获取周期性预约失败')
  }
})