/**
 * 周期性预约冲突检查
 * POST /api/v1/reservations/recurring/[id]/conflict-check
 */

import { recurringConflictDetectionEngine } from '~~/server/services/conflict-detection'
import { RecurringReservationService } from '~~/server/services/recurring-reservation-service'
import prisma from '~~/server/services/database'
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
    const recurringReservation = await RecurringReservationService.getRecurringReservation(id)
    if (!recurringReservation) {
      return createErrorResponse('NOT_FOUND', '周期性预约不存在')
    }

    if (recurringReservation.organizerId !== user.id) {
      return createErrorResponse('FORBIDDEN', '无权限操作此预约')
    }

    // 获取会议室信息
    const roomInfo = await prisma.meetingRoom.findUnique({
      where: { id: recurringReservation.roomId }
    })

    if (!roomInfo) {
      return createErrorResponse('NOT_FOUND', '会议室不存在')
    }

    // 获取现有的预约
    const existingReservations = await prisma.reservation.findMany({
      where: {
        roomId: recurringReservation.roomId,
        status: { not: 'CANCELED' },
        OR: body.excludeReservationId ? [
          { id: { not: body.excludeReservationId } }
        ] : []
      },
      orderBy: { startTime: 'asc' }
    })

    // 解析日期范围
    let dateRange
    if (body.startDate && body.endDate) {
      dateRange = {
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate)
      }
    } else {
      // 默认检查未来90天
      const now = new Date()
      dateRange = {
        startDate: now,
        endDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      }
    }

    // 检测冲突
    const conflictResult = await recurringConflictDetectionEngine.detectRecurringConflicts({
      recurringReservation,
      existingReservations,
      roomInfo,
      dateRange,
      options: {
        maxInstances: body.maxInstances || 50,
        skipHolidays: body.skipHolidays !== false
      }
    })

    // 如果需要，提供解决建议
    let resolutionSuggestions
    if (body.includeSuggestions !== false && conflictResult.hasConflict) {
      resolutionSuggestions = await recurringConflictDetectionEngine.suggestConflictResolution(
        conflictResult,
        recurringReservation
      )
    }

    return createSuccessResponse({
      conflictResult,
      resolutionSuggestions,
      checkedRange: dateRange,
      checkedInstances: conflictResult.totalInstances
    }, 'CHECK_SUCCESS', '冲突检查完成')
  } catch (error: any) {
    console.error('冲突检查失败:', error)
    return createErrorResponse('CHECK_FAILED', error.message || '冲突检查失败')
  }
})