/**
 * 批量操作周期性预约
 * POST /api/v1/reservations/recurring/[id]/batch-operation
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

    // 数据验证
    const requiredFields = ['operation']
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse('VALIDATION_ERROR', `缺少必需字段: ${field}`)
      }
    }

    // 验证操作类型
    const validOperations = ['pause', 'resume', 'cancel', 'delete']
    if (!validOperations.includes(body.operation)) {
      return createErrorResponse('VALIDATION_ERROR', '无效的操作类型')
    }

    // 验证预约存在且属于当前用户
    const recurringReservation = await RecurringReservationService.getRecurringReservation(id)
    if (!recurringReservation) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (recurringReservation.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限操作此预约')
    }

    // 解析 fromDate
    let fromDate
    if (body.fromDate) {
      fromDate = new Date(body.fromDate)
      if (isNaN(fromDate.getTime())) {
        return createErrorResponse('VALIDATION_ERROR', '无效的日期格式')
      }
    }

    // 执行批量操作
    const result = await RecurringReservationService.batchOperation({
      recurringReservationId: id,
      operation: body.operation,
      fromDate,
      reason: body.reason
    })

    let message = ''
    switch (body.operation) {
      case 'pause':
        message = '周期性预约已暂停'
        break
      case 'resume':
        message = '周期性预约已恢复'
        break
      case 'cancel':
        message = `已取消 ${result.affected} 个预约实例`
        break
      case 'delete':
        message = '周期性预约已删除'
        break
    }

    return createSuccessResponse(result, 'OPERATION_SUCCESS', message)
  } catch (error: any) {
    console.error('批量操作失败:', error)
    return createErrorResponse('OPERATION_FAILED', error.message || '批量操作失败')
  }
})