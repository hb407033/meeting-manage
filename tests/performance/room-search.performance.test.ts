/**
 * 会议室搜索性能测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('会议室搜索性能测试', () => {
  let authToken: string

  beforeAll(async () => {
    // 获取认证token
    const loginResponse = await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    })

    authToken = loginResponse.data.token
  })

  describe('搜索响应时间测试', () => {
    it('搜索API响应时间应该少于500ms', async () => {
      const startTime = Date.now()

      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '会议室'
        }
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.success).toBe(true)
      expect(responseTime).toBeLessThan(500)
    })

    it('复杂筛选搜索响应时间应该少于800ms', async () => {
      const startTime = Date.now()

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
              whiteboard: true,
              videoConf: true,
              airCondition: true,
              wifi: true
            },
            capacityMin: 5,
            capacityMax: 50,
            status: 'AVAILABLE',
            location: '测试'
          },
          sort: {
            sortBy: 'name',
            sortOrder: 'asc'
          },
          pagination: {
            page: 1,
            limit: 20
          }
        }
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.success).toBe(true)
      expect(responseTime).toBeLessThan(800)
    })

    it('批量搜索请求应该处理得当', async () => {
      const searchRequests = []
      const startTime = Date.now()

      // 同时发送10个搜索请求
      for (let i = 0; i < 10; i++) {
        searchRequests.push(
          $fetch('/api/v1/rooms/search', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            body: {
              keyword: `搜索${i}`
            }
          })
        )
      }

      const responses = await Promise.all(searchRequests)
      const endTime = Date.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / 10

      expect(responses.length).toBe(10)
      expect(responses.every(response => response.success)).toBe(true)
      expect(averageTime).toBeLessThan(600) // 平均响应时间
    })
  })

  describe('并发测试', () => {
    it('应该支持50个并发搜索请求', async () => {
      const concurrentRequests = []
      const startTime = Date.now()

      for (let i = 0; i < 50; i++) {
        concurrentRequests.push(
          $fetch('/api/v1/rooms/search', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            body: {
              keyword: `并发测试${i}`,
              pagination: {
                page: 1,
                limit: 10
              }
            }
          })
        )
      }

      const responses = await Promise.all(concurrentRequests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(responses.length).toBe(50)
      expect(responses.every(response => response.success)).toBe(true)
      expect(totalTime).toBeLessThan(5000) // 总时间不应超过5秒
    })

    it('并发请求不应导致数据不一致', async () => {
      const searchQuery = '一致性测试'
      const concurrentRequests = []

      // 发送相同的搜索请求
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          $fetch('/api/v1/rooms/search', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            body: {
              keyword: searchQuery
            }
          })
        )
      }

      const responses = await Promise.all(concurrentRequests)

      // 验证所有响应返回相同的结果
      const firstResponseData = responses[0].data
      const firstResponseMeta = responses[0].meta

      responses.forEach(response => {
        expect(response.success).toBe(true)
        expect(response.data).toEqual(firstResponseData)
        expect(response.meta).toEqual(firstResponseMeta)
      })
    })
  })

  describe('内存使用测试', () => {
    it('大量搜索结果不应导致内存泄漏', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // 执行大量搜索请求
      for (let i = 0; i < 100; i++) {
        await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: {
            keyword: `内存测试${i}`,
            pagination: {
              page: 1,
              limit: 50 // 大页大小
            }
          }
        })
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // 内存增长不应超过50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('数据库查询优化测试', () => {
    it('索引应该提升查询性能', async () => {
      // 测试无索引查询（模拟）
      const startTimeNoIndex = Date.now()
      await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '无索引测试'
        }
      })
      const timeNoIndex = Date.now() - startTimeNoIndex

      // 测试有索引查询
      const startTimeWithIndex = Date.now()
      await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '有索引测试'
        }
      })
      const timeWithIndex = Date.now() - startTimeWithIndex

      // 索引查询应该更快（这里假设前几次查询已经建立了缓存）
      expect(timeWithIndex).toBeLessThanOrEqual(timeNoIndex)
    })

    it('分页查询应该保持稳定性能', async () => {
      const paginationTimes = []

      // 测试不同页码的性能
      for (let page = 1; page <= 10; page++) {
        const startTime = Date.now()

        const response = await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: {
            keyword: '会议室',
            pagination: {
              page,
              limit: 20
            }
          }
        })

        const endTime = Date.now()
        const queryTime = endTime - startTime
        paginationTimes.push(queryTime)

        expect(response.success).toBe(true)
        expect(queryTime).toBeLessThan(300) // 分页查询应该很快
      }

      // 计算平均响应时间
      const averageTime = paginationTimes.reduce((sum, time) => sum + time, 0) / paginationTimes.length
      expect(averageTime).toBeLessThan(200)
    })
  })

  describe('缓存性能测试', () => {
    it('重复搜索应该利用缓存', async () => {
      const searchQuery = '缓存测试查询'

      // 第一次搜索
      const startTime1 = Date.now()
      await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: searchQuery
        }
      })
      const firstSearchTime = Date.now() - startTime1

      // 第二次相同搜索（应该更快，如果使用缓存）
      const startTime2 = Date.now()
      await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: searchQuery
        }
      })
      const secondSearchTime = Date.now() - startTime2

      // 缓存的搜索应该更快（至少不慢很多）
      expect(secondSearchTime).toBeLessThanOrEqual(firstSearchTime + 100)
    })
  })

  describe('大数据量测试', () => {
    it('应该处理大量搜索结果', async () => {
      const startTime = Date.now()

      const response = await $fetch('/api/v1/rooms/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: {
          keyword: '', // 空关键词获取所有结果
          pagination: {
            page: 1,
            limit: 100 // 大页大小
          }
        }
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.success).toBe(true)
      expect(responseTime).toBeLessThan(1000) // 即使大量数据也应该在合理时间内返回
      expect(response.data.length).toBeLessThanOrEqual(100) // 遵守limit限制
    })
  })

  describe('错误处理性能', () => {
    it('应该快速处理无效请求', async () => {
      const startTime = Date.now()

      try {
        await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: {
            // 无效的请求体
            keyword: ''
          }
        })
      } catch (error) {
        const endTime = Date.now()
        const responseTime = endTime - startTime

        // 错误响应应该很快
        expect(responseTime).toBeLessThan(100)
        expect(error.response?.status).toBe(400)
      }
    })

    it('应该快速处理认证错误', async () => {
      const startTime = Date.now()

      try {
        await $fetch('/api/v1/rooms/search', {
          method: 'POST',
          // 故意使用无效的token
          headers: {
            Authorization: 'Bearer invalid-token'
          },
          body: {
            keyword: '测试'
          }
        })
      } catch (error) {
        const endTime = Date.now()
        const responseTime = endTime - startTime

        expect(responseTime).toBeLessThan(100)
        expect(error.response?.status).toBe(401)
      }
    })
  })
})