/**
 * 创建周期性预约
 * POST /api/v1/reservations/recurring
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

    const body = await readBody(event)

    // 数据验证
    const requiredFields = ['title', 'roomId', 'startTime', 'endTime', 'pattern']
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse('VALIDATION_ERROR', `缺少必需字段: ${field}`)
      }
    }

    // 验证时间
    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return createErrorResponse('VALIDATION_ERROR', '无效的时间格式')
    }

    if (endTime <= startTime) {
      return createErrorResponse('VALIDATION_ERROR', '结束时间必须晚于开始时间')
    }

    // 创建周期性预约
    const recurringReservation = await RecurringReservationService.createRecurringReservation({
      title: body.title,
      description: body.description,
      organizerId: user.id,
      roomId: body.roomId,
      startTime,
      endTime,
      pattern: body.pattern,
      timezone: body.timezone,
      skipHolidays: body.skipHolidays,
      holidayRegion: body.holidayRegion,
      bufferMinutes: body.bufferMinutes,
      maxBookingAhead: body.maxBookingAhead,
      notes: body.notes,
      generateInstances: body.generateInstances !== false,
      checkConflicts: body.checkConflicts !== false
    })

    return createSuccessResponse(recurringReservation, 'CREATE_SUCCESS', '周期性预约创建成功')
  } catch (error: any) {
    console.error('创建周期性预约失败:', error)
    return createErrorResponse('CREATE_FAILED', error.message || '创建周期性预约失败')
  }
})