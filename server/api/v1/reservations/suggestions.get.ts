import { getRequiredCurrentUser } from '~~/server/utils/auth'
import { z } from 'zod'

const querySchema = z.object({
  date: z.string().optional(),
  roomIds: z.string().optional(),
  maxResults: z.coerce.number().min(1).max(20).default(5),
  algorithms: z.string().optional(),
  userId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    // 验证用户认证
    const user = await getRequiredCurrentUser(event)

    // 解析查询参数
    const query = await getValidatedQuery(event, querySchema.parse)

    const date = query.date ? new Date(query.date) : new Date()
    const roomIds = query.roomIds ? query.roomIds.split(',') : []
    const algorithms = query.algorithms ? query.algorithms.split(',') : ['usage-pattern', 'equipment-match']
    const maxResults = query.maxResults
    const userId = query.userId || session.user.id

    // 获取会议室数据
    const meetingRooms = await prisma.meetingRoom.findMany({
      where: {
        ...(roomIds.length > 0 && { id: { in: roomIds } }),
        status: 'available'
      },
      select: {
        id: true,
        name: true,
        type: true,
        capacity: true,
        location: true,
        equipment: true,
        features: true
      }
    })

    if (meetingRooms.length === 0) {
      return {
        success: true,
        data: [],
        message: '没有可用的会议室'
      }
    }

    // 获取用户偏好（如果可用）
    let userPreferences = null
    try {
      userPreferences = await getUserPreferences(userId)
    } catch (error) {
      console.warn('Failed to load user preferences:', error)
    }

    // 生成智能推荐
    const suggestions = await generateIntelligentSuggestions({
      date,
      rooms: meetingRooms,
      userPreferences,
      algorithms,
      maxResults,
      userId
    })

    return {
      success: true,
      data: suggestions,
      meta: {
        total: suggestions.length,
        algorithms: algorithms,
        date: date.toISOString(),
        userPreferences: !!userPreferences
      }
    }

  } catch (error) {
    console.error('Error generating suggestions:', error)

    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '请求参数无效',
        data: error.errors
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: '生成推荐失败'
    })
  }
})

/**
 * 获取用户偏好设置
 */
async function getUserPreferences(userId: string) {
  // 这里可以从数据库获取用户偏好，现在返回默认值
  return {
    preferredTimes: ['morning', 'afternoon'],
    preferredRooms: [],
    equipmentRequirements: [],
    minCapacity: 2,
    maxDuration: 120,
    avoidTimes: []
  }
}

/**
 * 生成智能推荐
 */
async function generateIntelligentSuggestions({
  date,
  rooms,
  userPreferences,
  algorithms,
  maxResults,
  userId
}: {
  date: Date
  rooms: any[]
  userPreferences: any
  algorithms: string[]
  maxResults: number
  userId: string
}) {
  const suggestions = []
  const dateStr = date.toISOString().split('T')[0]

  // 生成时间段
  const timeSlots = generateTimeSlots(date, userPreferences)

  // 为每个房间和时间段生成推荐
  for (const room of rooms) {
    for (const timeSlot of timeSlots) {
      // 检查可用性
      const isAvailable = await checkRoomAvailability(room.id, timeSlot.start, timeSlot.end)

      if (isAvailable) {
        // 计算推荐分数
        const score = await calculateSuggestionScore({
          room,
          timeSlot,
          userPreferences,
          algorithms,
          userId,
          date
        })

        if (score.overall > 30) { // 只保留分数超过30%的推荐
          suggestions.push({
            id: `suggestion-${room.id}-${timeSlot.start.getTime()}`,
            roomId: room.id,
            roomName: room.name,
            startTime: timeSlot.start.toISOString(),
            endTime: timeSlot.end.toISOString(),
            score: score.overall,
            confidence: score.confidence,
            reasons: score.reasons,
            metadata: {
              algorithm: score.primaryAlgorithm,
              userPreference: userPreferences,
              historicalUsage: score.historicalUsage,
              equipmentMatch: score.equipmentMatch,
              locationPreference: score.locationPreference
            }
          })
        }
      }
    }
  }

  // 排序并返回指定数量的推荐
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

/**
 * 生成时间段
 */
function generateTimeSlots(date: Date, userPreferences: any) {
  const slots = []
  const startHour = 8
  const endHour = 22
  const slotDuration = 60 // 每个时间段1小时

  for (let hour = startHour; hour < endHour; hour += slotDuration / 60) {
    const startTime = new Date(date)
    startTime.setHours(hour, 0, 0, 0)

    const endTime = new Date(date)
    endTime.setHours(hour + slotDuration / 60, 0, 0, 0)

    // 检查是否符合用户时间偏好
    if (matchesTimePreference(startTime, userPreferences.preferredTimes)) {
      slots.push({ start: startTime, end: endTime })
    }
  }

  return slots
}

/**
 * 检查时间段是否符合用户偏好
 */
function matchesTimePreference(time: Date, preferredTimes: string[]): boolean {
  if (!preferredTimes || preferredTimes.length === 0) return true

  const hour = time.getHours()

  for (const preference of preferredTimes) {
    switch (preference) {
      case 'morning':
        if (hour >= 8 && hour < 12) return true
        break
      case 'afternoon':
        if (hour >= 12 && hour < 18) return true
        break
      case 'evening':
        if (hour >= 18 && hour < 22) return true
        break
    }
  }

  return false
}

/**
 * 检查房间可用性
 */
async function checkRoomAvailability(roomId: string, startTime: Date, endTime: Date): Promise<boolean> {
  try {
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: {
          in: ['confirmed', 'pending']
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    })

    return !conflictingReservation
  } catch (error) {
    console.error('Error checking room availability:', error)
    return false
  }
}

/**
 * 计算推荐分数
 */
async function calculateSuggestionScore({
  room,
  timeSlot,
  userPreferences,
  algorithms,
  userId,
  date
}: {
  room: any
  timeSlot: any
  userPreferences: any
  algorithms: string[]
  userId: string
  date: Date
}) {
  let score = 50 // 基础分数
  const reasons = []
  let primaryAlgorithm = 'usage-pattern'

  // 时间偏好算法
  if (algorithms.includes('time-preference')) {
    const timeScore = calculateTimePreferenceScore(timeSlot.start, userPreferences)
    score += timeScore.points
    if (timeScore.points > 0) {
      reasons.push(timeScore.reason)
      primaryAlgorithm = 'time-preference'
    }
  }

  // 设备匹配算法
  if (algorithms.includes('equipment-match') && userPreferences.equipmentRequirements?.length > 0) {
    const equipmentScore = calculateEquipmentMatchScore(room, userPreferences.equipmentRequirements)
    score += equipmentScore.points
    if (equipmentScore.points > 0) {
      reasons.push(equipmentScore.reason)
    }
  }

  // 使用模式算法
  if (algorithms.includes('usage-pattern')) {
    const usageScore = await calculateUsagePatternScore(room.id, userId, timeSlot.start)
    score += usageScore.points
    if (usageScore.points > 0) {
      reasons.push(usageScore.reason)
    }
  }

  // 位置偏好算法
  if (algorithms.includes('location-proximity') && userPreferences.locationPreference) {
    const locationScore = calculateLocationScore(room, userPreferences.locationPreference)
    score += locationScore.points
    if (locationScore.points > 0) {
      reasons.push(locationScore.reason)
    }
  }

  // 容量匹配
  if (room.capacity >= (userPreferences.minCapacity || 2)) {
    score += 10
    reasons.push('容量符合要求')
  }

  // 时间段质量
  const hour = timeSlot.start.getHours()
  if (hour >= 9 && hour <= 11) {
    score += 15
    reasons.push('黄金时间段')
  } else if (hour >= 14 && hour <= 16) {
    score += 10
    reasons.push('优质时间段')
  }

  // 确保分数在合理范围内
  score = Math.max(0, Math.min(100, score))

  // 计算置信度
  const confidence = calculateConfidence(score, reasons.length, algorithms)

  // 获取历史使用数据
  const historicalUsage = await getHistoricalUsage(room.id, userId)

  return {
    overall: Math.round(score),
    confidence,
    reasons: reasons.slice(0, 3), // 最多返回3个原因
    primaryAlgorithm,
    historicalUsage,
    equipmentMatch: userPreferences.equipmentRequirements?.length > 0 ?
      Math.round(calculateEquipmentMatchScore(room, userPreferences.equipmentRequirements).points * 10) : 0,
    locationPreference: userPreferences.locationPreference ?
      Math.round(calculateLocationScore(room, userPreferences.locationPreference).points * 10) : 0
  }
}

function calculateTimePreferenceScore(time: Date, preferences: any) {
  if (!preferences.preferredTimes || preferences.preferredTimes.length === 0) {
    return { points: 0, reason: '' }
  }

  const hour = time.getHours()

  for (const preference of preferences.preferredTimes) {
    switch (preference) {
      case 'morning':
        if (hour >= 8 && hour < 12) {
          return { points: 20, reason: '符合上午时段偏好' }
        }
        break
      case 'afternoon':
        if (hour >= 12 && hour < 18) {
          return { points: 15, reason: '符合下午时段偏好' }
        }
        break
      case 'evening':
        if (hour >= 18 && hour < 22) {
          return { points: 10, reason: '符合晚上时段偏好' }
        }
        break
    }
  }

  return { points: 0, reason: '' }
}

function calculateEquipmentMatchScore(room: any, requirements: string[]) {
  if (!requirements || requirements.length === 0 || !room.equipment) {
    return { points: 0, reason: '' }
  }

  const matches = requirements.filter(req => room.equipment.includes(req))
  const matchPercentage = matches.length / requirements.length

  if (matchPercentage === 1) {
    return { points: 25, reason: '设备完全匹配' }
  } else if (matchPercentage >= 0.5) {
    return { points: 15, reason: '设备部分匹配' }
  }

  return { points: 0, reason: '' }
}

async function calculateUsagePatternScore(roomId: string, userId: string, date: Date) {
  try {
    // 查询用户在该会议室的历史预约
    const historicalReservations = await prisma.reservation.count({
      where: {
        roomId,
        userId,
        status: 'completed'
      }
    })

    if (historicalReservations >= 3) {
      return { points: 20, reason: '您经常使用这个会议室' }
    } else if (historicalReservations >= 1) {
      return { points: 10, reason: '您曾经使用过这个会议室' }
    }

    return { points: 0, reason: '' }
  } catch (error) {
    return { points: 0, reason: '' }
  }
}

function calculateLocationScore(room: any, preferredLocation: string) {
  if (!room.location || !preferredLocation) {
    return { points: 0, reason: '' }
  }

  if (room.location.toLowerCase().includes(preferredLocation.toLowerCase())) {
    return { points: 15, reason: '位置符合偏好' }
  }

  return { points: 0, reason: '' }
}

function calculateConfidence(score: number, reasonCount: number, algorithms: string[]): number {
  let confidence = 0.5 // 基础置信度

  // 分数越高，置信度越高
  confidence += (score / 100) * 0.3

  // 原因越多，置信度越高
  confidence += (reasonCount / 3) * 0.2

  // 算法越多，置信度越高
  confidence += (algorithms.length / 4) * 0.1

  return Math.min(0.95, confidence) // 最大置信度95%
}

async function getHistoricalUsage(roomId: string, userId: string): Promise<number> {
  try {
    const totalCount = await prisma.reservation.count({
      where: {
        roomId,
        userId,
        status: 'completed'
      }
    })

    // 返回该用户在该会议室的预约次数占总预约次数的百分比
    const totalUserReservations = await prisma.reservation.count({
      where: {
        userId,
        status: 'completed'
      }
    })

    return totalUserReservations > 0 ? Math.round((totalCount / totalUserReservations) * 100) : 0
  } catch (error) {
    return 0
  }
}