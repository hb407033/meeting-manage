/**
 * 获取周期性预约实例列表
 * GET /api/v1/reservations/recurring/[id]/occurrences
 */

import RecurringReservationEngine from '~~/server/services/recurring-reservation-engine'
import { RecurringReservationService } from '~~/server/services/recurring-reservation-service'
import { createSuccessResponse, createErrorResponse } from '~~/server/utils/response'
import { getCurrentUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // 获取当前用户
    const user = await getCurrentUser(event)
    if (!user?.id) {
      return createErrorResponse('UNAUTHORIZED', '请先登录')
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      return createErrorResponse('VALIDATION_ERROR', '缺少预约ID')
    }

    const query = getQuery(event)

    // 验证预约存在且属于当前用户
    const recurringReservation = await RecurringReservationService.getRecurringReservation(id)
    if (!recurringReservation) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (recurringReservation.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限查看此预约')
    }

    // 解析日期范围
    let dateRange
    if (query.startDate && query.endDate) {
      dateRange = {
        startDate: new Date(query.startDate as string),
        endDate: new Date(query.endDate as string)
      }

      if (isNaN(dateRange.startDate.getTime()) || isNaN(dateRange.endDate.getTime())) {
        return createErrorResponse('VALIDATION_ERROR', '无效的日期格式')
      }
    }

    // 解析选项
    const options = {
      maxOccurrences: Math.min(parseInt(query.maxOccurrences as string) || 50, 100),
      includeExceptions: query.includeExceptions !== 'false',
      skipHolidays: query.skipHolidays !== 'false' ? recurringReservation.skipHolidays : false,
      bufferMinutes: recurringReservation.bufferMinutes
    }

    // 生成预约实例
    const occurrences = await RecurringReservationEngine.generateOccurrences(
      recurringReservation,
      dateRange,
      options
    )

    // 获取统计信息
    const statistics = await RecurringReservationEngine.getStatistics(
      id,
      dateRange
    )

    return createSuccessResponse({
      occurrences,
      statistics,
      total: occurrences.length,
      dateRange
    }, 'FETCH_SUCCESS', '获取预约实例成功')
  } catch (error: any) {
    console.error('获取预约实例失败:', error)
    return createErrorResponse('FETCH_FAILED', error.message || '获取预约实例失败')
  }
})