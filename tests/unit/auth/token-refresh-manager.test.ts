/**
 * TokenRefreshManager 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenRefreshManager, RefreshErrorType } from '~/utils/token-refresh-manager'

// Mock useNuxtApp
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $apiFetch: vi.fn()
  })
}))

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager
  let mockApiFetch: any

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new TokenRefreshManager({
      maxRetries: 2,
      retryDelay: 100,
      backoffMultiplier: 2,
      maxRetryDelay: 1000,
      refreshTimeout: 1000
    })

    // Mock $apiFetch
    mockApiFetch = vi.fn()
    vi.mocked(useNuxtApp).mockReturnValue({
      $apiFetch: mockApiFetch
    } as any)
  })

  afterEach(() => {
    manager.reset()
    vi.useRealTimers()
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(manager.getRefreshStatus()).toEqual({
        isRefreshing: false,
        queueLength: 0,
        retryCount: 0,
        lastRefreshAttempt: 0
      })
    })

    it('应该重置状态', () => {
      // 模拟一些状态
      manager.getRefreshStatus()
      manager.reset()

      const status = manager.getRefreshStatus()
      expect(status.isRefreshing).toBe(false)
      expect(status.queueLength).toBe(0)
      expect(status.retryCount).toBe(0)
    })

    it('应该清空队列', async () => {
      const refreshToken = 'test-refresh-token'

      // 启动一个刷新请求（但不完成）
      const refreshPromise = manager.refreshTokens(refreshToken)

      // 清空队列
      manager.clearQueue()

      // 验证队列已清空
      const status = manager.getRefreshStatus()
      expect(status.queueLength).toBe(0)

      // 验证Promise被拒绝
      await expect(refreshPromise).rejects.toThrow('令牌刷新队列已清空')
    })
  })

  describe('令牌刷新', () => {
    it('应该成功刷新令牌', async () => {
      const refreshToken = 'test-refresh-token'
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: { tokens: mockTokens }
      })

      const result = await manager.refreshTokens(refreshToken)

      expect(result).toEqual(mockTokens)
      expect(mockApiFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken }
      })

      const status = manager.getRefreshStatus()
      expect(status.retryCount).toBe(0)
    })

    it('应该处理刷新失败', async () => {
      const refreshToken = 'invalid-refresh-token'
      const error = new Error('Invalid refresh token')

      mockApiFetch.mockRejectedValueOnce(error)

      await expect(manager.refreshTokens(refreshToken)).rejects.toThrow('Invalid refresh token')

      const status = manager.getRefreshStatus()
      expect(status.isRefreshing).toBe(false)
    })

    it('应该处理没有刷新令牌的情况', async () => {
      await expect(manager.refreshTokens('')).rejects.toThrow('没有可用的刷新令牌')
    })
  })

  describe('并发处理', () => {
    it('应该正确处理并发刷新请求', async () => {
      const refreshToken = 'test-refresh-token'
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      // 模拟慢速响应
      mockApiFetch.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { tokens: mockTokens }
        }), 100))
      )

      // 同时启动多个刷新请求
      const promises = Array.from({ length: 5 }, (_, i) =>
        manager.refreshTokens(refreshToken)
      )

      const results = await Promise.all(promises)

      // 所有请求都应该返回相同的结果
      results.forEach(result => {
        expect(result).toEqual(mockTokens)
      })

      // 只应该调用一次API
      expect(mockApiFetch).toHaveBeenCalledTimes(1)

      const status = manager.getRefreshStatus()
      expect(status.queueLength).toBe(0)
    })

    it('应该正确排队请求', async () => {
      const refreshToken = 'test-refresh-token'
      let resolveApi: any

      // 模拟慢速API响应
      mockApiFetch.mockImplementationOnce(() =>
        new Promise(resolve => {
          resolveApi = resolve
        })
      )

      // 启动第一个请求
      const promise1 = manager.refreshTokens(refreshToken)

      // 验证正在刷新
      expect(manager.getRefreshStatus().isRefreshing).toBe(true)

      // 启动第二个请求
      const promise2 = manager.refreshTokens(refreshToken)

      // 验证第二个请求被排队
      expect(manager.getRefreshStatus().queueLength).toBe(1)

      // 完成API调用
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      resolveApi!({
        success: true,
        data: { tokens: mockTokens }
      })

      // 验证两个请求都成功
      await expect(promise1).resolves.toEqual(mockTokens)
      await expect(promise2).resolves.toEqual(mockTokens)
    })
  })

  describe('重试机制', () => {
    it('应该重试可重试的错误', async () => {
      vi.useFakeTimers()

      const refreshToken = 'test-refresh-token'
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      // 第一次失败，第二次成功
      mockApiFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { tokens: mockTokens }
        })

      const promise = manager.refreshTokens(refreshToken)

      // 快进时间以触发重试
      await vi.advanceTimersByTimeAsync(100)

      const result = await promise
      expect(result).toEqual(mockTokens)
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })

    it('应该在达到最大重试次数后停止', async () => {
      vi.useFakeTimers()

      const refreshToken = 'test-refresh-token'
      const error = new Error('Network error')

      mockApiFetch.mockRejectedValue(error)

      const promise = manager.refreshTokens(refreshToken)

      // 快进时间以触发所有重试
      await vi.advanceTimersByTimeAsync(300) // 100 + 200

      await expect(promise).rejects.toThrow('Network error')
      expect(mockApiFetch).toHaveBeenCalledTimes(3) // 1 + 2 重试
    })

    it('不应该重试不可重试的错误', async () => {
      const refreshToken = 'invalid-refresh-token'

      mockApiFetch.mockRejectedValueOnce({
        statusCode: 401,
        message: 'Unauthorized'
      })

      await expect(manager.refreshTokens(refreshToken)).rejects.toThrow()

      // 只应该调用一次，不进行重试
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('错误分类', () => {
    it('应该正确分类网络错误', async () => {
      const refreshToken = 'test-refresh-token'
      const error = new Error('fetch failed')
      error.name = 'FetchError'

      mockApiFetch.mockRejectedValueOnce(error)

      try {
        await manager.refreshTokens(refreshToken)
      } catch (err: any) {
        expect(err.type).toBe(RefreshErrorType.NETWORK_ERROR)
        expect(err.isRetryable).toBe(true)
      }
    })

    it('应该正确分类HTTP状态码错误', async () => {
      const refreshToken = 'test-refresh-token'

      // 401错误
      mockApiFetch.mockRejectedValueOnce({
        statusCode: 401,
        message: 'Unauthorized'
      })

      try {
        await manager.refreshTokens(refreshToken)
      } catch (err: any) {
        expect(err.type).toBe(RefreshErrorType.INVALID_REFRESH_TOKEN)
        expect(err.isRetryable).toBe(false)
      }

      // 500错误
      mockApiFetch.mockRejectedValueOnce({
        statusCode: 500,
        message: 'Internal Server Error'
      })

      try {
        await manager.refreshTokens(refreshToken)
      } catch (err: any) {
        expect(err.type).toBe(RefreshErrorType.SERVER_ERROR)
        expect(err.isRetryable).toBe(true)
      }
    })
  })

  describe('超时处理', () => {
    it('应该处理API超时', async () => {
      vi.useFakeTimers()

      const refreshToken = 'test-refresh-token'

      // 模拟不响应的API
      mockApiFetch.mockImplementationOnce(() => new Promise(() => {}))

      const promise = manager.refreshTokens(refreshToken)

      // 快进时间以触发超时
      await vi.advanceTimersByTimeAsync(1000)

      await expect(promise).rejects.toThrow('令牌刷新请求超时')
    })
  })

  describe('防抖功能', () => {
    it('应该防止过于频繁的刷新请求', async () => {
      vi.useFakeTimers()

      const refreshToken = 'test-refresh-token'
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      }

      mockApiFetch.mockResolvedValue({
        success: true,
        data: { tokens: mockTokens }
      })

      // 快速连续发送请求
      const promise1 = manager.refreshTokens(refreshToken)
      const promise2 = manager.refreshTokens(refreshToken)

      // 快进1秒以处理延迟的请求
      await vi.advanceTimersByTimeAsync(1000)

      // 等待处理完成
      await Promise.all([promise1, promise2])

      // 应该只调用一次API
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })
  })
})