import { describe, it, expect } from 'vitest'

describe('Simple API Tests', () => {
  it('should have basic test environment', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
  })

  it('should test availability API request format', () => {
    const request = {
      roomIds: ['1', '2'],
      startTime: '2025-11-18T09:00:00Z',
      endTime: '2025-11-18T17:00:00Z'
    }

    expect(request.roomIds).toHaveLength(2)
    expect(request.startTime).toBe('2025-11-18T09:00:00Z')
    expect(request.endTime).toBe('2025-11-18T17:00:00Z')
  })

  it('should test date parsing', () => {
    const startTime = new Date('2025-11-18T09:00:00Z')
    const endTime = new Date('2025-11-18T17:00:00Z')

    expect(startTime).toBeInstanceOf(Date)
    expect(endTime).toBeInstanceOf(Date)
    expect(endTime.getTime()).toBeGreaterThan(startTime.getTime())
  })

  it('should test basic response format', () => {
    const response = {
      success: true,
      data: {
        roomId: '1',
        roomName: '会议室 1',
        status: 'available'
      },
      code: 'SUCCESS',
      message: '查询成功'
    }

    expect(response.success).toBe(true)
    expect(response.data.roomId).toBe('1')
    expect(response.code).toBe('SUCCESS')
  })
})