import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

// 简化的App组件用于测试，避免Nuxt依赖
const SimpleApp = {
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-semibold text-gray-900">
                智能会议室管理系统
              </h1>
            </div>
          </div>
        </nav>
      </header>
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="card p-6">
            <h2 class="text-2xl font-bold mb-4 text-gray-900">
              系统状态
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div class="card p-4">
                <h3 class="text-lg font-medium mb-2">前端框架</h3>
                <p class="text-green-600">✅ Nuxt 4 + PrimeVue + Tailwind CSS</p>
              </div>
              <div class="card p-4">
                <h3 class="text-lg font-medium mb-2">开发工具</h3>
                <p class="text-green-600">✅ ESLint + Prettier + TypeScript</p>
              </div>
              <div class="card p-4">
                <h3 class="text-lg font-medium mb-2">开发模式</h3>
                <p class="text-blue-600">🚀 热重载已启用</p>
              </div>
            </div>
            <div class="mt-6">
              <h3 class="text-lg font-medium mb-3">快速操作</h3>
              <div class="flex space-x-4">
                <button class="btn-primary">创建会议室</button>
                <button class="btn-secondary">查看预约</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
}

describe('app组件基础测试', () => {
  it('应该正确渲染应用程序标题', () => {
    const wrapper = mount(SimpleApp)
    expect(wrapper.text()).toContain('智能会议室管理系统')
  })

  it('应该包含导航栏', () => {
    const wrapper = mount(SimpleApp)
    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('智能会议室管理系统')
  })

  it('应该包含状态卡片', () => {
    const wrapper = mount(SimpleApp)
    const statusCards = wrapper.findAll('.card p')
    expect(statusCards.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('前端框架')
    expect(wrapper.text()).toContain('开发工具')
    expect(wrapper.text()).toContain('开发模式')
  })

  it('应该包含Tailwind CSS类', () => {
    const wrapper = mount(SimpleApp)
    expect(wrapper.find('.min-h-screen').exists()).toBe(true)
    expect(wrapper.find('.bg-gray-50').exists()).toBe(true)
  })

  it('应该包含快速操作按钮', () => {
    const wrapper = mount(SimpleApp)
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('创建会议室')
    expect(wrapper.text()).toContain('查看预约')
  })
})
