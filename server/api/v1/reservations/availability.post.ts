import { createSuccessResponse, createErrorResponse, API_CODES } from '~~/server/utils/response'
import { getRequiredCurrentUser } from '~~/server/utils/auth'

interface AvailabilityRequest {
  roomIds: string[]
  startTime: string // ISO datetime
  endTime: string   // ISO datetime
  includeUnavailable?: boolean
}

interface AvailabilityCacheKey {
  roomIds: string[]
  startTime: string
  endTime: string
}

interface AvailabilityResponse {
  [roomId: string]: {
    roomId: string
    roomName: string
    status: 'available' | 'unavailable' | 'maintenance'
    availableSlots?: Array<{
      startTime: string
      endTime: string
      duration: number // minutes
    }>
    reservations?: Array<{
      id: string
      title: string
      startTime: string
      endTime: string
      organizerName?: string
      status: string
    }>
    maintenanceSlots?: Array<{
      id: string
      startTime: string
      endTime: string
      reason?: string
    }>
  }
}

export default defineEventHandler(async (event) => {
  const startTimeOverall = Date.now()

  try {
    // 验证用户会话
    const user = await getRequiredCurrentUser(event)

    // 获取请求体
    const body = await readBody(event) as AvailabilityRequest

    // 临时简化：移除缓存功能，先实现基本查询
    // const cacheParams: AvailabilityCacheKey = {
    //   roomIds: body.roomIds,
    //   startTime: body.startTime,
    //   endTime: body.endTime
    // }

    // 尝试从缓存获取数据
    // const cachedData = await availabilityCacheService.getAvailability(cacheParams)
    // if (cachedData) {
    //   const cacheTime = Date.now() - startTimeOverall
    //   console.log(`📦 Cache hit! Total response time: ${cacheTime}ms`)
    //   return createSuccessResponse(cachedData)
    // }

    // 验证请求参数
    if (!body.roomIds || !Array.isArray(body.roomIds) || body.roomIds.length === 0) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, 'roomIds 参数是必需的')
    }

    if (!body.startTime || !body.endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, 'startTime 和 endTime 参数是必需的')
    }

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '时间格式无效')
    }

    if (startTime >= endTime) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '开始时间必须早于结束时间')
    }

    // 查询时间范围限制（最多查询30天）
    const maxQueryRange = 30 * 24 * 60 * 60 * 1000 // 30天
    if (endTime.getTime() - startTime.getTime() > maxQueryRange) {
      return createErrorResponse(API_CODES.INVALID_REQUEST, '查询时间范围不能超过30天')
    }

    // 检查缓存
    const cacheParams: AvailabilityCacheKey = {
      roomIds: body.roomIds,
      startTime: body.startTime,
      endTime: body.endTime
    }

    // 尝试从缓存获取数据
    const cachedData = await availabilityCacheService.getAvailability(cacheParams)
    if (cachedData) {
      const cacheTime = Date.now() - startTimeOverall
      console.log(`📦 Cache hit! Total response time: ${cacheTime}ms`)
      return createSuccessResponse(cachedData)
    }

    // 临时简化：移除复杂的数据库查询，返回基本响应
    // TODO: 实现完整的可用性查询逻辑
    const response: AvailabilityResponse = {}

    body.roomIds.forEach(roomId => {
      response[roomId] = {
        roomId: roomId,
        roomName: `会议室 ${roomId}`,
        status: 'available',
        availableSlots: [
          {
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            duration: 120
          }
        ],
        reservations: [],
        maintenanceSlots: []
      }
    })

    // 记录性能指标
    const totalTime = Date.now() - startTimeOverall
    console.log(`🚀 Availability query completed in ${totalTime}ms for ${body.roomIds.length} rooms`)

    // 性能警告
    if (totalTime > 200) {
      console.warn(`⚠️ Slow availability query: ${totalTime}ms (target: < 200ms)`)
    }

    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Availability query error:', error)

    if (error instanceof Error) {
      return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, error.message)
    }

    return createErrorResponse(API_CODES.INTERNAL_SERVER_ERROR, '查询可用性失败')
  }
})