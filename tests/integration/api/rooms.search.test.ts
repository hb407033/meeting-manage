/**
 * 会议室搜索 API 集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('会议室搜索 API', () => {
  let authToken: string
  let testRoomId: string

  beforeAll(async () => {
    // 创建测试用户并获取认证token
    const loginResponse = await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    })

    authToken = loginResponse.data.token

    // 创建测试会议室
    const roomResponse = await $fetch('/api/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: {
        name: '测试会议室搜索',
        description: '这是一个用于测试搜索功能的会议室',
        capacity: 10,
        location: '测试楼层A区',
        equipment: {
          projector: true,
          whiteboard: true,
          videoConf: false,
          airCondition: true,
          wifi: true
        },
        status: 'AVAILABLE'
      }
    })

    testRoomId = roomResponse.data.id
  })

  afterAll(async () => {
    // 清理测试数据
    try {
      await $fetch(`/api/v1/rooms/${testRoomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('POST /api/v1/rooms/search', () => {
    it('应该成功搜索会议室', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '测试会议室'
        }
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.meta).toBeDefined()
      expect(response.meta.searchKeyword).toBe('测试会议室')
    })

    it('应该支持模糊搜索', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '测试'
        }
      })

      expect(response.success).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
      // 验证返回的会议室包含关键词
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
    })

    it('应该支持按位置搜索', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: 'A区'
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
    })

    it('应该支持按描述搜索', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '搜索功能'
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
    })

    it('应该支持设备筛选', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          filters: {
            equipment: {
              projector: true,
              whiteboard: true
            }
          }
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
      expect(foundTestRoom.equipment.projector).toBe(true)
      expect(foundTestRoom.equipment.whiteboard).toBe(true)
    })

    it('应该支持容量范围筛选', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          filters: {
            capacityMin: 5,
            capacityMax: 15
          }
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
      expect(foundTestRoom.capacity).toBeGreaterThanOrEqual(5)
      expect(foundTestRoom.capacity).toBeLessThanOrEqual(15)
    })

    it('应该支持状态筛选', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          filters: {
            status: 'AVAILABLE'
          }
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
      expect(foundTestRoom.status).toBe('AVAILABLE')
    })

    it('应该支持排序功能', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          sort: {
            sortBy: 'capacity',
            sortOrder: 'asc'
          }
        }
      })

      expect(response.success).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)

      // 验证排序
      for (let i = 1; i < response.data.length; i++) {
        expect(response.data[i].capacity).toBeGreaterThanOrEqual(response.data[i - 1].capacity)
      }
    })

    it('应该支持分页功能', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          pagination: {
            page: 1,
            limit: 5
          }
        }
      })

      expect(response.success).toBe(true)
      expect(response.meta.page).toBe(1)
      expect(response.meta.limit).toBe(5)
      expect(response.data.length).toBeLessThanOrEqual(5)
    })

    it('应该返回正确的分页元信息', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室',
          pagination: {
            page: 1,
            limit: 2
          }
        }
      })

      expect(response.success).toBe(true)
      expect(response.meta).toBeDefined()
      expect(response.meta.total).toBeGreaterThan(0)
      expect(response.meta.totalPages).toBeGreaterThanOrEqual(1)
      expect(response.meta.hasNext).toBeDefined()
      expect(response.meta.hasPrev).toBe(false) // 第一页没有上一页
    })

    it('应该拒绝没有认证的请求', async () => {
      try {
        await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          body: {
            keyword: '会议室'
          }
        })
        expect.fail('应该抛出认证错误')
      } catch (error: any) {
        expect(error.response?.status).toBe(401)
      }
    })

    it('应该验证请求参数', async () => {
      try {
        await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: {
            // 缺少必需的 keyword 字段
            filters: {}
          }
        })
        expect.fail('应该抛出验证错误')
      } catch (error: any) {
        expect(error.response?.status).toBe(400)
        expect(error.data?.message).toContain('验证失败')
      }
    })

    it('应该处理空搜索结果', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '不存在的会议室xyz123'
        }
      })

      expect(response.success).toBe(true)
      expect(response.data).toEqual([])
      expect(response.meta.total).toBe(0)
    })

    it('应该处理特殊字符搜索', async () => {
      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '测试!@#$%^&*()'
        }
      })

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
    })
  })

  describe('GET /api/v1/rooms (扩展筛选功能)', () => {
    it('应该支持设备筛选参数', async () => {
      const response = await $fetch('/api/v1/rooms', {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        query: {
          search: '测试',
          equipment: JSON.stringify({
            projector: true
          })
        }
      })

      expect(response.success).toBe(true)
      expect(response.data.items).toBeDefined()
      const foundTestRoom = response.data.items.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
    })

    it('应该支持位置参数', async () => {
      const response = await $fetch('/api/v1/rooms', {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        query: {
          location: '测试楼层'
        }
      })

      expect(response.success).toBe(true)
      const foundTestRoom = response.data.items.find((room: any) => room.id === testRoomId)
      expect(foundTestRoom).toBeDefined()
    })

    it('应该支持按位置排序', async () => {
      const response = await $fetch('/api/v1/rooms', {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        query: {
          sortBy: 'location',
          sortOrder: 'asc'
        }
      })

      expect(response.success).toBe(true)
      expect(response.data.items.length).toBeGreaterThan(0)
    })
  })
})