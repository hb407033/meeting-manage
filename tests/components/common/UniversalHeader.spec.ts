import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref, computed, watch, onMounted, onUnmounted, onUpdated, nextTick } from 'vue'
import UniversalHeader from '../../../app/components/UniversalHeader.vue'
import { useAuth } from '../../../app/composables/useAuth'

// Stub Vue globals for auto-import support
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('onUnmounted', onUnmounted)
vi.stubGlobal('onUpdated', onUpdated)
vi.stubGlobal('nextTick', nextTick)
vi.mock('../../../app/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({
      id: '1',
      name: '测试用户',
      email: 'test@example.com',
      role: 'ADMIN'
    }),
    isAuthenticated: ref(true),
    canAccess: vi.fn(() => true),
    logout: vi.fn()
  })
}))

// Mock Nuxt composables
vi.stubGlobal('useRoute', () => ({
  path: '/dashboard',
  query: {},
  fullPath: '/dashboard'
}))

vi.stubGlobal('useRouter', () => ({
  push: vi.fn()
}))

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  onClickOutside: vi.fn(),
  onKeyStroke: vi.fn()
}))

describe('UniversalHeader', () => {
  let router: any

  beforeEach(() => {
    // 创建测试路由实例
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
        { path: '/reservations', component: { template: '<div>Reservations</div>' } },
        { path: '/reservations/detailed', component: { template: '<div>Detailed Reservations</div>' } },
        { path: '/reservations/my', component: { template: '<div>My Reservations</div>' } },
        { path: '/reservations/calendar', component: { template: '<div>Reservation Calendar</div>' } },
        { path: '/rooms', component: { template: '<div>Rooms</div>' } },
        { path: '/rooms/search', component: { template: '<div>Room Search</div>' } },
        { path: '/admin/rooms', component: { template: '<div>Admin Rooms</div>' } },
        { path: '/admin/users', component: { template: '<div>Admin Users</div>' } },
        { path: '/admin/permissions', component: { template: '<div>Admin Permissions</div>' } },
        { path: '/admin/settings', component: { template: '<div>Admin Settings</div>' } },
        { path: '/admin/audit', component: { template: '<div>Admin Audit</div>' } },
        { path: '/profile', component: { template: '<div>Profile</div>' } },
        { path: '/settings', component: { template: '<div>Settings</div>' } }
      ]
    })
  })

  const createWrapper = (currentRoute = '/dashboard') => {
    return mount(UniversalHeader, {
      global: {
        plugins: [router],
        stubs: {
          NuxtLink: { template: '<a><slot /></a>' },
          Icon: { template: '<i></i>' }
        }
      }
    })
  }

  beforeEach(async () => {
    await router.push('/')
  })

  it('应该正确渲染组件结构', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('.max-w-7xl').exists()).toBe(true)
    expect(wrapper.find('.flex.justify-between').exists()).toBe(true)
  })

  it('应该显示正确的页面标题', async () => {
    const wrapper = createWrapper()

    // 测试默认标题
    await router.push('/dashboard')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('智能会议室管理系统')

    // 测试预约页面标题
    await router.push('/reservations')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('预约管理')

    // 测试会议室页面标题
    await router.push('/rooms')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('会议室列表')

    // 测试管理页面标题
    await router.push('/admin/users')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('用户管理')
  })

  it('应该显示主导航菜单', () => {
    const wrapper = createWrapper()

    // 预约菜单
    expect(wrapper.text()).toContain('预约')

    // 会议室管理菜单
    expect(wrapper.text()).toContain('会议室管理')

    // 系统管理菜单
    expect(wrapper.text()).toContain('系统管理')
  })

  it('应该显示用户信息', async () => {
    const wrapper = createWrapper()

    // 用户名应该在主区域显示
    expect(wrapper.text()).toContain('测试用户')

    // 点击用户菜单以显示下拉菜单
    const userMenuButton = wrapper.find('.flex.items-center.text-sm.rounded-full')
    await userMenuButton.trigger('click')
    await wrapper.vm.$nextTick()

    // 邮箱和角色在下拉菜单中
    expect(wrapper.text()).toContain('test@example.com')
    expect(wrapper.text()).toContain('ADMIN')
  })

  it('应该显示通知图标', () => {
    const wrapper = createWrapper()

    // 查找包含 bell 图标的按钮
    const notificationButton = wrapper.find('button.relative.p-1')
    expect(notificationButton.exists()).toBe(true)
  })

  it('应该显示用户头像', () => {
    const wrapper = createWrapper()

    const userAvatar = wrapper.find('.h-8.w-8.rounded-full')
    expect(userAvatar.exists()).toBe(true)
    // 中文用户名"测试用户"的首字母是"测"
    expect(userAvatar.text()).toContain('测')
  })

  it('应该根据权限显示菜单项', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // 管理员用户应该能看到所有菜单
    expect(wrapper.text()).toContain('系统管理')
    expect(wrapper.text()).toContain('会议室管理')
    expect(wrapper.text()).toContain('预约')
  })

  it('应该正确处理移动端菜单', async () => {
    const wrapper = createWrapper()

    // 移动端菜单按钮应该存在
    const mobileMenuButton = wrapper.find('.md\\:hidden button')
    expect(mobileMenuButton.exists()).toBe(true)

    // 点击移动端菜单按钮
    await mobileMenuButton.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证 showMobileMenu 状态已改变
    expect(wrapper.vm.showMobileMenu).toBe(true)
  })

  it('应该正确识别激活的路由', () => {
    const wrapper = createWrapper()

    // 测试激活状态检查函数
    expect(wrapper.vm.isRouteActive('/dashboard')).toBe(false)
    expect(wrapper.vm.isRouteActive('/reservations')).toBe(false)

    // 测试路由前缀匹配
    expect(wrapper.vm.isRouteActive('/admin')).toBe(false) // 当前路由是 /
  })

  it('应该正确计算用户角色', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.isAdmin).toBe(true) // 用户角色是 ADMIN
    expect(wrapper.vm.userRole).toBe('ADMIN')
  })

  it('应该正确处理登出操作', async () => {
    const wrapper = createWrapper()

    // 先打开用户菜单
    const userMenuButton = wrapper.find('.flex.items-center.text-sm.rounded-full')
    await userMenuButton.trigger('click')
    await wrapper.vm.$nextTick()

    // 找到登出按钮并点击
    const logoutButton = wrapper.find('button[class*="block w-full"]')
    expect(logoutButton.exists()).toBe(true)

    await logoutButton.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证菜单已关闭
    expect(wrapper.vm.showUserMenu).toBe(false)
  })
})