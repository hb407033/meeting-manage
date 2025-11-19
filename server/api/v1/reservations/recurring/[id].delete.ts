/**
 * 删除周期性预约
 * DELETE /api/v1/reservations/recurring/[id]
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

    const query = getQuery(event)
    const deleteInstances = query.deleteInstances !== 'false'

    // 验证预约存在且属于当前用户
    const existing = await RecurringReservationService.getRecurringReservation(id)
    if (!existing) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (existing.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限操作此预约')
    }

    // 删除周期性预约
    await RecurringReservationService.deleteRecurringReservation(id, deleteInstances)

    return createSuccessResponse(
      { id, deletedInstances: deleteInstances },
      'DELETE_SUCCESS',
      '删除周期性预约成功'
    )
  } catch (error: any) {
    console.error('删除周期性预约失败:', error)
    return createErrorResponse('DELETE_FAILED', error.message || '删除周期性预约失败')
  }
})