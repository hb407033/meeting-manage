import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConflictDetectionEngine } from '~/server/services/conflict-detection'
import { conflictDetectionCache } from '~/server/services/conflict-detection-cache'

describe('ConflictDetectionEngine', () => {
  let engine: ConflictDetectionEngine
  let mockRoomInfo: any
  let mockExistingReservations: any[]

  beforeEach(() => {
    engine = new ConflictDetectionEngine()

    mockRoomInfo = {
      id: 'room-1',
      name: '会议室A',
      capacity: 10,
      equipment: ['projector', 'whiteboard'],
      status: 'available',
      rules: {
        minBookingDuration: 30,
        maxBookingDuration: 240,
        bufferTime: 15,
        advanceBookingMin: 60,
        advanceBookingMax: 30
      }
    }

    mockExistingReservations = [
      {
        id: 'reservation-1',
        roomId: 'room-1',
        userId: 'user-1',
        title: '团队会议',
        startTime: new Date('2025-01-20T10:00:00'),
        endTime: new Date('2025-01-20T11:00:00'),
        attendeeCount: 8,
        equipment: [],
        status: 'confirmed'
      }
    ]
  })

  afterEach(() => {
    // 清理缓存
    conflictDetectionCache.clearAllCache()
  })

  describe('detectConflicts', () => {
    it('should detect no conflicts for valid reservation', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '新会议',
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00'),
        attendeeCount: 5,
        equipment: []
      }

      const params = {
        reservation,
        existingReservations: mockExistingReservations,
        roomInfo: mockRoomInfo
      }

      const result = await engine.detectConflicts(params)

      expect(result.hasConflict).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      expect(result.suggestions).toBeDefined()
    })

    it('should detect time overlap conflict', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '冲突会议',
        startTime: new Date('2025-01-20T10:30:00'),
        endTime: new Date('2025-01-20T11:30:00'),
        attendeeCount: 5,
        equipment: []
      }

      const params = {
        reservation,
        existingReservations: mockExistingReservations,
        roomInfo: mockRoomInfo
      }

      const result = await engine.detectConflicts(params)

      expect(result.hasConflict).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].type).toBe('time_overlap')
      expect(result.conflicts[0].severity).toBe('high')
      expect(result.conflicts[0].description).toContain('时间与现有预约')
    })

    it('should detect capacity conflict', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '大型会议',
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00'),
        attendeeCount: 15, // 超过容量
        equipment: []
      }

      const params = {
        reservation,
        existingReservations: [],
        roomInfo: mockRoomInfo
      }

      const result = await engine.detectConflicts(params)

      expect(result.hasConflict).toBe(true)
      expect(result.conflicts.some(c => c.type === 'capacity_exceeded')).toBe(true)
    })

    it('should detect equipment conflict', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '演示会议',
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00'),
        attendeeCount: 5,
        equipment: ['projector', 'video_conference', 'microphone'] // microphone不在room设备中
      }

      const params = {
        reservation,
        existingReservations: [],
        roomInfo: mockRoomInfo
      }

      const result = await engine.detectConflicts(params)

      expect(result.hasConflict).toBe(true)
      expect(result.conflicts.some(c => c.type === 'equipment_conflict')).toBe(true)
    })

    it('should generate alternative time suggestions when conflicts exist', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '冲突会议',
        startTime: new Date('2025-01-20T10:30:00'),
        endTime: new Date('2025-01-20T11:30:00'),
        attendeeCount: 5,
        equipment: []
      }

      const params = {
        reservation,
        existingReservations: mockExistingReservations,
        roomInfo: mockRoomInfo
      }

      const result = await engine.detectConflicts(params)

      expect(result.hasConflict).toBe(true)
      expect(result.suggestions).toBeDefined()
      expect(Array.isArray(result.suggestions)).toBe(true)
    })
  })

  describe('detectTimeOverlaps', () => {
    it('should detect complete overlap', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        startTime: new Date('2025-01-20T10:30:00'),
        endTime: new Date('2025-01-20T10:45:00')
      }

      const conflicts = engine.detectTimeOverlaps(reservation, mockExistingReservations)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('time_overlap')
    })

    it('should detect partial overlap', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        startTime: new Date('2025-01-20T09:30:00'),
        endTime: new Date('2025-01-20T10:30:00')
      }

      const conflicts = engine.detectTimeOverlaps(reservation, mockExistingReservations)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('time_overlap')
    })

    it('should not detect overlap for different rooms', () => {
      const reservation = {
        roomId: 'room-2', // 不同的会议室
        userId: 'user-2',
        startTime: new Date('2025-01-20T10:30:00'),
        endTime: new Date('2025-01-20T10:45:00')
      }

      const conflicts = engine.detectTimeOverlaps(reservation, mockExistingReservations)

      expect(conflicts).toHaveLength(0)
    })
  })

  describe('detectCapacityConflict', () => {
    it('should detect capacity exceeded', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        attendeeCount: 15,
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00')
      }

      const conflict = engine.detectCapacityConflict(reservation, mockRoomInfo)

      expect(conflict).toBeTruthy()
      expect(conflict!.type).toBe('capacity_exceeded')
      expect(conflict!.severity).toBe('high')
    })

    it('should not detect capacity conflict when attendee count is acceptable', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        attendeeCount: 8,
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00')
      }

      const conflict = engine.detectCapacityConflict(reservation, mockRoomInfo)

      expect(conflict).toBeNull()
    })

    it('should handle missing attendee count', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00')
      }

      const conflict = engine.detectCapacityConflict(reservation, mockRoomInfo)

      expect(conflict).toBeNull()
    })
  })

  describe('detectEquipmentConflicts', () => {
    it('should detect missing required equipment', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        equipment: ['projector', 'microphone'], // microphone不在room设备中
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00')
      }

      const conflicts = engine.detectEquipmentConflicts(reservation, mockRoomInfo)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('equipment_conflict')
      expect(conflicts[0].severity).toBe('medium')
    })

    it('should not detect equipment conflict when all required equipment is available', () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        equipment: ['projector', 'whiteboard'], // 都在room设备中
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00')
      }

      const conflicts = engine.detectEquipmentConflicts(reservation, mockRoomInfo)

      expect(conflicts).toHaveLength(0)
    })
  })

  describe('detectBatchConflicts', () => {
    it('should detect conflicts for multiple reservations', async () => {
      const reservations = [
        {
          roomId: 'room-1',
          userId: 'user-2',
          title: '会议1',
          startTime: new Date('2025-01-20T10:30:00'),
          endTime: new Date('2025-01-20T11:30:00'),
          attendeeCount: 5,
          equipment: []
        },
        {
          roomId: 'room-1',
          userId: 'user-3',
          title: '会议2',
          startTime: new Date('2025-01-20T14:00:00'),
          endTime: new Date('2025-01-20T15:00:00'),
          attendeeCount: 8,
          equipment: []
        }
      ]

      const rooms = [mockRoomInfo]

      const results = await engine.detectBatchConflicts(reservations, rooms, mockExistingReservations)

      expect(results).toHaveLength(2)
      expect(results[0].hasConflict).toBe(true) // 第一个与现有预约冲突
      expect(results[1].hasConflict).toBe(false) // 第二个没有冲突
    })

    it('should handle non-existent rooms', async () => {
      const reservations = [
        {
          roomId: 'non-existent-room',
          userId: 'user-2',
          title: '无效会议室会议',
          startTime: new Date('2025-01-20T14:00:00'),
          endTime: new Date('2025-01-20T15:00:00'),
          attendeeCount: 5,
          equipment: []
        }
      ]

      const rooms = [mockRoomInfo]

      const results = await engine.detectBatchConflicts(reservations, rooms, mockExistingReservations)

      expect(results).toHaveLength(1)
      expect(results[0].hasConflict).toBe(true)
      expect(results[0].conflicts[0].description).toContain('会议室不存在')
    })
  })

  describe('generateAlternativeTimeSlots', () => {
    it('should generate time slots that avoid conflicts', async () => {
      const reservation = {
        roomId: 'room-1',
        userId: 'user-2',
        title: '冲突会议',
        startTime: new Date('2025-01-20T10:30:00'),
        endTime: new Date('2025-01-20T11:30:00'),
        attendeeCount: 5,
        equipment: []
      }

      const params = {
        reservation,
        existingReservations: mockExistingReservations,
        roomInfo: mockRoomInfo
      }

      const availableSlots = await engine.getAvailableTimeSlots(
        reservation.roomId,
        reservation.startTime,
        mockRoomInfo,
        mockExistingReservations
      )

      expect(availableSlots).toBeDefined()
      expect(Array.isArray(availableSlots)).toBe(true)

      // 验证生成的时间段不与现有预约冲突
      const conflictingSlots = availableSlots.filter(slot => {
        return mockExistingReservations.some(existing =>
          existing.roomId === reservation.roomId &&
          existing.status !== 'cancelled' &&
          ((slot.startTime >= existing.startTime && slot.startTime < existing.endTime) ||
           (slot.endTime > existing.startTime && slot.endTime <= existing.endTime) ||
           (slot.startTime <= existing.startTime && slot.endTime >= existing.endTime))
        )
      })

      expect(conflictingSlots).toHaveLength(0)
    })
  })

  describe('Performance', () => {
    it('should handle large number of existing reservations efficiently', async () => {
      // 创建大量现有预约
      const largeReservationList = Array.from({ length: 1000 }, (_, i) => ({
        id: `reservation-${i}`,
        roomId: 'room-1',
        userId: `user-${i}`,
        title: `会议 ${i}`,
        startTime: new Date(2025, 0, 1, Math.floor(i / 40), (i % 40) * 15, 0, 0),
        endTime: new Date(2025, 0, 1, Math.floor(i / 40), ((i % 40) + 1) * 15, 0, 0),
        attendeeCount: Math.floor(Math.random() * 10) + 1,
        equipment: [],
        status: 'confirmed'
      }))

      const reservation = {
        roomId: 'room-1',
        userId: 'user-new',
        title: '新会议',
        startTime: new Date('2025-01-20T14:00:00'),
        endTime: new Date('2025-01-20T15:00:00'),
        attendeeCount: 5,
        equipment: []
      }

      const startTime = Date.now()
      const result = await engine.detectConflicts({
        reservation,
        existingReservations: largeReservationList,
        roomInfo: mockRoomInfo
      })
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(100) // 应该在100ms内完成
    })
  })
})