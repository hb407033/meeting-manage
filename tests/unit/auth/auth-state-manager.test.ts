/**
 * AuthStateManager 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthStateManager } from '~/utils/auth-state-manager'
import type { User } from '~/stores/auth'

describe('AuthStateManager', () => {
  let manager: AuthStateManager
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600
  }

  beforeEach(() => {
    // 清理localStorage
    localStorage.clear()
    vi.clearAllMocks()

    // 模拟浏览器环境
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true
    })

    // 创建新的管理器实例
    manager = new AuthStateManager()
  })

  afterEach(() => {
    manager.reset()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该正确初始化初始状态', () => {
      const state = manager.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.tokenExpiresAt).toBeNull()
      expect(state.lastSync).toBe(0)
    })

    it('应该从localStorage恢复有效状态', () => {
      // 设置localStorage数据
      const storedState = {
        version: '1.0.0',
        state: {
          user: mockUser,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          tokenExpiresAt: Date.now() + 3600000, // 1小时后过期
          isAuthenticated: true,
          lastSync: Date.now()
        }
      }

      localStorage.setItem('auth_state_manager', JSON.stringify(storedState))

      // 创建新实例（会触发初始化）
      const newManager = new AuthStateManager()
      const state = newManager.getState()

      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe(mockTokens.accessToken)
      expect(state.isAuthenticated).toBe(true)
    })

    it('应该拒绝无效的存储状态', () => {
      // 设置无效状态（有用户但没有令牌）
      const invalidState = {
        version: '1.0.0',
        state: {
          user: mockUser,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isAuthenticated: true,
          lastSync: Date.now()
        }
      }

      localStorage.setItem('auth_state_manager', JSON.stringify(invalidState))

      const newManager = new AuthStateManager()
      const state = newManager.getState()

      // 应该重置为初始状态
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })

    it('应该拒绝过期的存储状态', () => {
      // 设置过期状态
      const expiredState = {
        version: '1.0.0',
        state: {
          user: mockUser,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          tokenExpiresAt: Date.now() - 120000, // 2分钟前过期
          isAuthenticated: true,
          lastSync: Date.now()
        }
      }

      localStorage.setItem('auth_state_manager', JSON.stringify(expiredState))

      const newManager = new AuthStateManager()
      const state = newManager.getState()

      // 应该重置为初始状态
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('状态管理', () => {
    it('应该正确更新认证状态', () => {
      manager.updateAuthState(mockUser, mockTokens)

      const state = manager.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe(mockTokens.accessToken)
      expect(state.refreshToken).toBe(mockTokens.refreshToken)
      expect(state.isAuthenticated).toBe(true)
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now())
    })

    it('应该正确清除认证状态', () => {
      // 先设置状态
      manager.updateAuthState(mockUser, mockTokens)
      expect(manager.getState().isAuthenticated).toBe(true)

      // 清除状态
      manager.clearAuthState()

      const state = manager.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.tokenExpiresAt).toBeNull()
    })

    it('应该正确处理登出', () => {
      manager.updateAuthState(mockUser, mockTokens)
      manager.logout()

      const state = manager.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('存储同步', () => {
    beforeEach(() => {
      // 使用FakeTimers来控制防抖
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该防抖保存到localStorage', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem')

      manager.updateAuthState(mockUser, mockTokens)

      // 立即检查，不应该保存（防抖）
      expect(setItemSpy).not.toHaveBeenCalled()

      // 快进时间以触发保存
      vi.advanceTimersByTime(100)

      expect(setItemSpy).toHaveBeenCalledWith(
        'auth_state_manager',
        expect.stringContaining(mockTokens.accessToken)
      )
    })

    it('应该正确同步事件', (done) => {
      // 创建第二个管理器实例模拟另一个标签页
      const manager2 = new AuthStateManager()

      // 设置监听器
      manager2.addEventListener((event) => {
        expect(event.type).toBe('auth_update')
        expect(event.data?.user).toEqual(mockUser)
        expect(event.data?.accessToken).toBe(mockTokens.accessToken)
        done()
      })

      // 第一个管理器更新状态
      manager.updateAuthState(mockUser, mockTokens)
    })
  })

  describe('令牌检查', () => {
    it('应该正确检查令牌是否即将过期', () => {
      // 设置即将过期的令牌（14分钟后过期）
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: 14 * 60 // 14分钟
      })

      expect(manager.isTokenExpiringSoon()).toBe(true)

      // 设置未即将过期的令牌（20分钟后过期）
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: 20 * 60 // 20分钟
      })

      expect(manager.isTokenExpiringSoon()).toBe(false)
    })

    it('应该正确检查令牌是否已过期', () => {
      // 设置过期的令牌
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: -1 // 已过期
      })

      expect(manager.isTokenExpired()).toBe(true)

      // 设置未过期的令牌
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: 3600 // 1小时
      })

      expect(manager.isTokenExpired()).toBe(false)
    })

    it('应该正确检查是否需要重新认证', () => {
      // 未认证状态
      expect(manager.needsReauthentication()).toBe(true)

      // 认证但令牌过期
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: -1
      })
      expect(manager.needsReauthentication()).toBe(true)

      // 正常认证状态
      manager.updateAuthState(mockUser, {
        ...mockTokens,
        expiresIn: 3600
      })
      expect(manager.needsReauthentication()).toBe(false)
    })
  })

  describe('事件监听', () => {
    it('应该正确添加和移除事件监听器', () => {
      const listener = vi.fn()

      manager.addEventListener(listener)
      manager.updateAuthState(mockUser, mockTokens)

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth_update',
          data: expect.objectContaining({
            user: mockUser
          })
        })
      )

      // 移除监听器
      manager.removeEventListener(listener)
      manager.clearAuthState()

      // 监听器不应该再被调用
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('应该处理监听器中的错误', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })

      const normalListener = vi.fn()

      manager.addEventListener(errorListener)
      manager.addEventListener(normalListener)

      // 应该不会因为监听器错误而中断
      expect(() => {
        manager.updateAuthState(mockUser, mockTokens)
      }).not.toThrow()

      expect(errorListener).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('版本兼容性', () => {
    it('应该拒绝不兼容版本的存储状态', () => {
      const incompatibleState = {
        version: '0.9.0', // 不兼容的版本
        state: {
          user: mockUser,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          tokenExpiresAt: Date.now() + 3600000,
          isAuthenticated: true,
          lastSync: Date.now()
        }
      }

      localStorage.setItem('auth_state_manager', JSON.stringify(incompatibleState))

      const newManager = new AuthStateManager()
      const state = newManager.getState()

      // 应该重置为初始状态
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('错误处理', () => {
    it('应该处理localStorage错误', () => {
      // Mock localStorage抛出错误
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage error')
      })

      // 应该不会抛出错误
      expect(() => {
        manager.updateAuthState(mockUser, mockTokens)
      }).not.toThrow()

      // 恢复原始方法
      localStorage.setItem = originalSetItem
    })

    it('应该处理JSON解析错误', () => {
      // 设置无效的JSON数据
      localStorage.setItem('auth_state_manager', 'invalid json')

      // 应该不会抛出错误
      expect(() => {
        const newManager = new AuthStateManager()
        const state = newManager.getState()
        expect(state.isAuthenticated).toBe(false)
      }).not.toThrow()
    })
  })

  describe('重置功能', () => {
    it('应该完全重置状态', () => {
      // 设置复杂状态
      manager.updateAuthState(mockUser, mockTokens)
      manager.addEventListener(vi.fn())

      // 重置
      manager.reset()

      // 验证状态被清除
      const state = manager.getState()
      expect(state).toEqual({
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isAuthenticated: false,
        lastSync: 0
      })

      // 验证localStorage被清除
      expect(localStorage.getItem('auth_state_manager')).toBeNull()
      expect(localStorage.getItem('auth_state_sync')).toBeNull()
    })
  })
})