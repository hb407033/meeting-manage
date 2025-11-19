/**
 * 更新周期性预约
 * PUT /api/v1/reservations/recurring/[id]
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

    const id = getRouterParam(event, 'id')
    if (!id) {
      return createErrorResponse('VALIDATION_ERROR', '缺少预约ID')
    }

    const body = await readBody(event)

    // 验证预约存在且属于当前用户
    const existing = await RecurringReservationService.getRecurringReservation(id)
    if (!existing) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (existing.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限操作此预约')
    }

    // 更新周期性预约
    const updatedReservation = await RecurringReservationService.updateRecurringReservation(id, {
      ...body,
      organizerId: user.id
    })

    return createSuccessResponse(updatedReservation, 'UPDATE_SUCCESS', '更新周期性预约成功')
  } catch (error: any) {
    console.error('更新周期性预约失败:', error)
    return createErrorResponse('UPDATE_FAILED', error.message || '更新周期性预约失败')
  }
})