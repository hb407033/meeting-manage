import { describe, it, expect } from 'vitest'

describe('基础测试', () => {
  it('应该正确执行数学计算', () => {
    expect(2 + 2).toBe(4)
    expect(3 * 3).toBe(9)
  })

  it('应该正确处理字符串', () => {
    const message = 'Hello, World!'
    expect(message).toBe('Hello, World!')
    expect(message.length).toBe(13)
  })

  it('应该正确处理数组操作', () => {
    const numbers = [1, 2, 3, 4, 5]
    expect(numbers).toHaveLength(5)
    expect(numbers.includes(3)).toBe(true)
    expect(numbers.filter(n => n > 3)).toEqual([4, 5])
  })

  it('应该正确处理对象操作', () => {
    const user = {
      name: '张三',
      age: 30,
      email: 'zhangsan@example.com'
    }
    expect(user.name).toBe('张三')
    expect(user.age).toBe(30)
    expect(user).toHaveProperty('email')
  })

  it('应该正确处理异步操作', async () => {
    const fetchData = () => new Promise(resolve => {
      setTimeout(() => resolve('数据加载完成'), 10)
    })

    const result = await fetchData()
    expect(result).toBe('数据加载完成')
  })
})

describe('测试环境配置', () => {
  it('process.env.NODE_ENV 应该设置为 test', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('应该能正确导入模块', async () => {
    const { setTimeout } = await import('node:timers/promises')
    expect(setTimeout).toBeDefined()
  })
})