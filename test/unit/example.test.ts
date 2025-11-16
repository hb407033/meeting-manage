import { describe, it, expect } from 'vitest'

describe('Example Tests', () => {
  it('should pass basic assertion', () => {
    expect(2 + 2).toBe(4)
    expect('hello').toBe('hello')
    expect(true).toBe(true)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('async result')
    expect(result).toBe('async result')
  })

  it('should handle object matching', () => {
    const user = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com'
    }

    expect(user).toHaveProperty('id', 1)
    expect(user).toHaveProperty('name')
    expect(user.name).toBe('Test User')
  })

  it('should handle array operations', () => {
    const numbers = [1, 2, 3, 4, 5]
    expect(numbers).toHaveLength(5)
    expect(numbers).toContain(3)
    expect(numbers).not.toContain(6)
  })

  it('should handle error throwing', () => {
    const throwingFunction = () => {
      throw new Error('Test error')
    }

    expect(throwingFunction).toThrow('Test error')
  })

  it('should mock functions', () => {
    const mockFn = vi.fn()
    mockFn('arg1', 'arg2')

    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})