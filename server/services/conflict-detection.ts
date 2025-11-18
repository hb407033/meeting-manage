/**
 * 预约冲突检测引擎
 * 检测时间重叠、容量超限、设备冲突等类型的预约冲突
 */

interface TimeSlot {
  startTime: Date
  endTime: Date
}

interface Reservation extends TimeSlot {
  id: string
  roomId: string
  userId: string
  title?: string
  attendeeCount?: number
  equipment?: string[]
  status: 'confirmed' | 'pending' | 'cancelled'
}

interface ConflictResult {
  hasConflict: boolean
  conflicts: Conflict[]
  suggestions?: TimeSlot[]
}

interface Conflict {
  type: 'time_overlap' | 'capacity_exceeded' | 'equipment_conflict' | 'maintenance_conflict'
  severity: 'high' | 'medium' | 'low'
  description: string
  conflictingReservation?: Reservation
  details?: any
}

interface MeetingRoom {
  id: string
  name: string
  capacity: number
  equipment: string[]
  status: 'available' | 'maintenance' | 'unavailable'
  rules?: {
    minBookingDuration?: number
    maxBookingDuration?: number
    bufferTime?: number
    advanceBookingMin?: number
    advanceBookingMax?: number
  }
}

interface ConflictDetectionParams {
  reservation: Omit<Reservation, 'id' | 'status'>
  existingReservations: Reservation[]
  roomInfo: MeetingRoom
  maintenanceSlots?: TimeSlot[]
}

export class ConflictDetectionEngine {
  /**
   * 检测预约冲突
   */
  async detectConflicts(params: ConflictDetectionParams): Promise<ConflictResult> {
    const conflicts: Conflict[] = []

    // 1. 时间重叠冲突检测
    const timeConflicts = this.detectTimeOverlaps(
      params.reservation,
      params.existingReservations.filter(r => r.status !== 'cancelled')
    )
    conflicts.push(...timeConflicts)

    // 2. 容量冲突检测
    const capacityConflict = this.detectCapacityConflict(
      params.reservation,
      params.roomInfo
    )
    if (capacityConflict) {
      conflicts.push(capacityConflict)
    }

    // 3. 设备冲突检测
    const equipmentConflicts = this.detectEquipmentConflicts(
      params.reservation,
      params.roomInfo
    )
    conflicts.push(...equipmentConflicts)

    // 4. 维护时间冲突检测
    const maintenanceConflicts = this.detectMaintenanceConflicts(
      params.reservation,
      params.maintenanceSlots || []
    )
    conflicts.push(...maintenanceConflicts)

    // 5. 预约规则冲突检测
    const ruleConflicts = this.detectBookingRuleConflicts(
      params.reservation,
      params.roomInfo
    )
    conflicts.push(...ruleConflicts)

    // 生成建议时间
    const suggestions = conflicts.length > 0
      ? this.generateAlternativeTimeSlots(params, conflicts)
      : []

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      suggestions
    }
  }

  /**
   * 检测时间重叠冲突
   */
  private detectTimeOverlaps(
    reservation: Omit<Reservation, 'id' | 'status'>,
    existingReservations: Reservation[]
  ): Conflict[] {
    const conflicts: Conflict[] = []

    for (const existing of existingReservations) {
      if (existing.roomId !== reservation.roomId) {
        continue // 不是同一会议室，跳过
      }

      if (this.hasTimeOverlap(reservation, existing)) {
        conflicts.push({
          type: 'time_overlap',
          severity: 'high',
          description: `时间与现有预约"${existing.title}"重叠`,
          conflictingReservation: existing,
          details: {
            existingTime: {
              start: existing.startTime,
              end: existing.endTime
            },
            newTime: {
              start: reservation.startTime,
              end: reservation.endTime
            }
          }
        })
      }
    }

    return conflicts
  }

  /**
   * 检查两个时间段是否重叠
   */
  private hasTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const start1 = slot1.startTime.getTime()
    const end1 = slot1.endTime.getTime()
    const start2 = slot2.startTime.getTime()
    const end2 = slot2.endTime.getTime()

    return start1 < end2 && start2 < end1
  }

  /**
   * 检测容量冲突
   */
  private detectCapacityConflict(
    reservation: Omit<Reservation, 'id' | 'status'>,
    roomInfo: MeetingRoom
  ): Conflict | null {
    if (!reservation.attendeeCount || !roomInfo.capacity) {
      return null
    }

    if (reservation.attendeeCount > roomInfo.capacity) {
      return {
        type: 'capacity_exceeded',
        severity: 'high',
        description: `参会人数(${reservation.attendeeCount})超过会议室容量(${roomInfo.capacity})`,
        details: {
          attendeeCount: reservation.attendeeCount,
          roomCapacity: roomInfo.capacity,
          excess: reservation.attendeeCount - roomInfo.capacity
        }
      }
    }

    return null
  }

  /**
   * 检测设备冲突
   */
  private detectEquipmentConflicts(
    reservation: Omit<Reservation, 'id' | 'status'>,
    roomInfo: MeetingRoom
  ): Conflict[] {
    const conflicts: Conflict[] = []

    if (!reservation.equipment || reservation.equipment.length === 0) {
      return conflicts
    }

    for (const equipment of reservation.equipment) {
      if (!roomInfo.equipment.includes(equipment)) {
        conflicts.push({
          type: 'equipment_conflict',
          severity: 'medium',
          description: `会议室缺少所需设备: ${equipment}`,
          details: {
            requestedEquipment: equipment,
            availableEquipment: roomInfo.equipment
          }
        })
      }
    }

    return conflicts
  }

  /**
   * 检测维护时间冲突
   */
  private detectMaintenanceConflicts(
    reservation: Omit<Reservation, 'id' | 'status'>,
    maintenanceSlots: TimeSlot[]
  ): Conflict[] {
    const conflicts: Conflict[] = []

    for (const maintenance of maintenanceSlots) {
      if (this.hasTimeOverlap(reservation, maintenance)) {
        conflicts.push({
          type: 'maintenance_conflict',
          severity: 'high',
          description: '预约时间与维护时间冲突',
          details: {
            maintenanceTime: {
              start: maintenance.startTime,
              end: maintenance.endTime
            },
            reservationTime: {
              start: reservation.startTime,
              end: reservation.endTime
            }
          }
        })
      }
    }

    return conflicts
  }

  /**
   * 检测预约规则冲突
   */
  private detectBookingRuleConflicts(
    reservation: Omit<Reservation, 'id' | 'status'>,
    roomInfo: MeetingRoom
  ): Conflict[] {
    const conflicts: Conflict[] = []
    const rules = roomInfo.rules
    if (!rules) return conflicts

    const now = new Date()
    const bookingDuration = reservation.endTime.getTime() - reservation.startTime.getTime()
    const advanceBookingTime = reservation.startTime.getTime() - now.getTime()

    // 检查最小预约时长
    if (rules.minBookingDuration && bookingDuration < rules.minBookingDuration * 60 * 1000) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'medium',
        description: `预约时长不足最小要求: ${rules.minBookingDuration}分钟`,
        details: {
          actualDuration: Math.round(bookingDuration / 60000),
          minDuration: rules.minBookingDuration
        }
      })
    }

    // 检查最大预约时长
    if (rules.maxBookingDuration && bookingDuration > rules.maxBookingDuration * 60 * 1000) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'medium',
        description: `预约时长超过最大限制: ${rules.maxBookingDuration}分钟`,
        details: {
          actualDuration: Math.round(bookingDuration / 60000),
          maxDuration: rules.maxBookingDuration
        }
      })
    }

    // 检查提前预约时间
    if (rules.advanceBookingMin && advanceBookingTime < rules.advanceBookingMin * 60 * 1000) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'medium',
        description: `需要提前预约: ${rules.advanceBookingMin}分钟`,
        details: {
          actualAdvanceTime: Math.round(advanceBookingTime / 60000),
          minAdvanceTime: rules.advanceBookingMin
        }
      })
    }

    // 检查最长提前预约时间
    if (rules.advanceBookingMax && advanceBookingTime > rules.advanceBookingMax * 24 * 60 * 60 * 1000) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'low',
        description: `提前预约时间超过限制: ${rules.advanceBookingMax}天`,
        details: {
          actualAdvanceDays: Math.round(advanceBookingTime / (24 * 60 * 60 * 1000)),
          maxAdvanceDays: rules.advanceBookingMax
        }
      })
    }

    return conflicts
  }

  /**
   * 生成可选时间建议
   */
  private generateAlternativeTimeSlots(
    params: ConflictDetectionParams,
    conflicts: Conflict[]
  ): TimeSlot[] {
    const suggestions: TimeSlot[] = []
    const { reservation, existingReservations, maintenanceSlots } = params

    // 获取冲突的时间段
    const conflictTimes = conflicts
      .filter(c => c.type === 'time_overlap' || c.type === 'maintenance_conflict')
      .map(c => ({
        start: c.details?.existingTime?.start || c.details?.maintenanceTime?.start,
        end: c.details?.existingTime?.end || c.details?.maintenanceTime?.end
      }))
      .filter(t => t.start && t.end)

    // 获取当天可用时间段（假设工作时间为8:00-18:00）
    const dayStart = new Date(reservation.startTime)
    dayStart.setHours(8, 0, 0, 0)
    const dayEnd = new Date(reservation.startTime)
    dayEnd.setHours(18, 0, 0, 0)

    const bookingDuration = reservation.endTime.getTime() - reservation.startTime.getTime()

    // 生成建议时间段
    const candidates = this.generateTimeCandidates(dayStart, dayEnd, bookingDuration)

    // 过滤掉有冲突的时间段
    for (const candidate of candidates) {
      const hasConflict = this.hasAnyConflict(candidate, conflictTimes, existingReservations, maintenanceSlots || [])

      if (!hasConflict) {
        suggestions.push(candidate)

        // 最多返回5个建议
        if (suggestions.length >= 5) {
          break
        }
      }
    }

    return suggestions
  }

  /**
   * 生成时间候选
   */
  private generateTimeCandidates(start: Date, end: Date, duration: number): TimeSlot[] {
    const candidates: TimeSlot[] = []
    const current = new Date(start)

    // 以30分钟为间隔生成候选时间
    while (current.getTime() + duration <= end.getTime()) {
      const candidateStart = new Date(current)
      const candidateEnd = new Date(current.getTime() + duration)

      candidates.push({
        startTime: candidateStart,
        endTime: candidateEnd
      })

      current.setMinutes(current.getMinutes() + 30)
    }

    return candidates
  }

  /**
   * 检查时间段是否有任何冲突
   */
  private hasAnyConflict(
    timeSlot: TimeSlot,
    conflictTimes: { start: Date; end: Date }[],
    existingReservations: Reservation[],
    maintenanceSlots: TimeSlot[]
  ): boolean {
    // 检查与冲突时间的重叠
    for (const conflictTime of conflictTimes) {
      if (this.hasTimeOverlap(timeSlot, conflictTime)) {
        return true
      }
    }

    // 检查与现有预约的重叠
    for (const reservation of existingReservations) {
      if (this.hasTimeOverlap(timeSlot, reservation)) {
        return true
      }
    }

    // 检查与维护时间的重叠
    for (const maintenance of maintenanceSlots) {
      if (this.hasTimeOverlap(timeSlot, maintenance)) {
        return true
      }
    }

    return false
  }

  /**
   * 批量检测多个预约的冲突
   */
  async detectBatchConflicts(
    reservations: Omit<Reservation, 'id' | 'status'>[],
    rooms: MeetingRoom[],
    existingReservations: Reservation[]
  ): Promise<ConflictResult[]> {
    const results: ConflictResult[] = []

    for (const reservation of reservations) {
      const roomInfo = rooms.find(r => r.id === reservation.roomId)
      if (!roomInfo) {
        results.push({
          hasConflict: true,
          conflicts: [{
            type: 'time_overlap',
            severity: 'high',
            description: `会议室不存在: ${reservation.roomId}`
          }]
        })
        continue
      }

      const result = await this.detectConflicts({
        reservation,
        existingReservations,
        roomInfo
      })

      results.push(result)
    }

    return results
  }

  /**
   * 获取会议室的可用时间段
   */
  async getAvailableTimeSlots(
    roomId: string,
    date: Date,
    roomInfo: MeetingRoom,
    existingReservations: Reservation[],
    maintenanceSlots: TimeSlot[] = []
  ): Promise<TimeSlot[]> {
    // 获取当天的工作时间段
    const dayStart = new Date(date)
    dayStart.setHours(8, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(18, 0, 0, 0)

    // 生成30分钟间隔的时间段
    const allSlots: TimeSlot[] = []
    const current = new Date(dayStart)

    while (current.getTime() + 30 * 60 * 1000 <= dayEnd.getTime()) {
      allSlots.push({
        startTime: new Date(current),
        endTime: new Date(current.getTime() + 30 * 60 * 1000)
      })
      current.setMinutes(current.getMinutes() + 30)
    }

    // 过滤掉不可用的时间段
    const availableSlots = allSlots.filter(slot => {
      return !this.hasAnyConflict(slot, [], existingReservations, maintenanceSlots)
    })

    return availableSlots
  }
}

// 导出单例实例
export const conflictDetectionEngine = new ConflictDetectionEngine()

// 默认导出
export default conflictDetectionEngine