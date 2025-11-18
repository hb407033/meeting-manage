import { availabilityCacheService } from '../services/availability-cache'

/**
 * 预约缓存失效中间件
 * 在预约相关的API调用后自动触发缓存失效
 */
export default defineEventHandler(async (event) => {
  // 只处理预约相关的POST/PUT/DELETE请求
  const method = getMethod(event)
  const url = getRequestURL(event)

  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return
  }

  // 检查是否是预约相关的API
  const reservationAPIPatterns = [
    '/api/v1/reservations',
    '/api/reservations'
  ]

  const isReservationAPI = reservationAPIPatterns.some(pattern =>
    url.pathname.startsWith(pattern)
  )

  if (!isReservationAPI) {
    return
  }

  try {
    // 获取请求体，提取会议室信息
    const body = await readBody(event).catch(() => null)

    if (body && body.roomId) {
      console.log(`🔄 检测到预约API调用，准备失效缓存: ${method} ${url.pathname}`)

      // 在API处理完成后立即失效缓存
      // 使用setImmediate确保在API响应发送后执行
      setImmediate(async () => {
        try {
          await availabilityCacheService.invalidateRoomAvailability(body.roomId)
          console.log(`✅ 缓存失效完成: room ${body.roomId}`)
        } catch (error) {
          console.error(`❌ 缓存失效失败: room ${body.roomId}`, error)
        }
      })
    }

    // 对于PUT/DELETE/PATCH请求，可能需要从路径参数中获取roomId
    if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
      const pathMatch = url.pathname.match(/\/reservations\/([^\/]+)/)
      if (pathMatch && pathMatch[1]) {
        const reservationId = pathMatch[1]

        // 这里需要根据reservationId查询对应的roomId
        // 简化处理：清空所有缓存
        setImmediate(async () => {
          try {
            await availabilityCacheService.invalidateRoomAvailability('all')
            console.log(`✅ 批量缓存失效完成: reservation ${reservationId}`)
          } catch (error) {
            console.error(`❌ 批量缓存失效失败: reservation ${reservationId}`, error)
          }
        })
      }
    }

  } catch (error) {
    console.warn('⚠️ 缓存失效中间件执行失败:', error)
    // 不影响API的正常执行
  }
})