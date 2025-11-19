/**
 * 创建周期性预约例外
 * POST /api/v1/reservations/recurring/exceptions
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
    const requiredFields = ['recurringReservationId', 'exceptionType', 'originalStartTime', 'originalEndTime']
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse('VALIDATION_ERROR', `缺少必需字段: ${field}`)
      }
    }

    // 验证时间
    const originalStartTime = new Date(body.originalStartTime)
    const originalEndTime = new Date(body.originalEndTime)
    let newStartTime, newEndTime

    if (body.newStartTime) {
      newStartTime = new Date(body.newStartTime)
      if (isNaN(newStartTime.getTime())) {
        return createErrorResponse('VALIDATION_ERROR', '无效的新开始时间')
      }
    }

    if (body.newEndTime) {
      newEndTime = new Date(body.newEndTime)
      if (isNaN(newEndTime.getTime())) {
        return createErrorResponse('VALIDATION_ERROR', '无效的新结束时间')
      }
    }

    if (isNaN(originalStartTime.getTime()) || isNaN(originalEndTime.getTime())) {
      return createErrorResponse('VALIDATION_ERROR', '无效的原始时间格式')
    }

    // 验证例外类型
    const validTypes = ['CANCELLED', 'MODIFIED', 'MOVED']
    if (!validTypes.includes(body.exceptionType)) {
      return createErrorResponse('VALIDATION_ERROR', '无效的例外类型')
    }

    // 验证预约存在且属于当前用户
    const recurringReservation = await RecurringReservationService.getRecurringReservation(
      body.recurringReservationId
    )
    if (!recurringReservation) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (recurringReservation.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限操作此预约')
    }

    // 创建例外
    const exception = await RecurringReservationService.createException({
      recurringReservationId: body.recurringReservationId,
      exceptionType: body.exceptionType,
      originalStartTime,
      originalEndTime,
      newStartTime,
      newEndTime,
      reason: body.reason
    })

    return createSuccessResponse(exception, 'CREATE_SUCCESS', '创建例外成功')
  } catch (error: any) {
    console.error('创建例外失败:', error)
    return createErrorResponse('CREATE_FAILED', error.message || '创建例外失败')
  }
})