import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import DevModeIndicator from '~/components/features/dev/DevModeIndicator.vue'

// Mock Nuxt runtime config
const mockRuntimeConfig = {
  public: {
    isDevelopment: true,
    devAutoLoginEnabled: true
  }
}

// Mock PrimeVue components
vi.mock('primevue/dialog', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['visible', 'header', 'modal', 'style']
  }
}))

vi.mock('primevue/message', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['severity', 'closable']
  }
}))

vi.mock('primevue/button', () => ({
  default: {
    template: '<button><slot /></button>',
    props: ['label', 'icon', 'size', 'variant', 'loading']
  }
}))

vi.mock('primevue/chip', () => ({
  default: {
    template: '<span><slot /></span>',
    props: ['label', 'size', 'class']
  }
}))

vi.mock('primevue/avatar', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['label', 'size', 'style']
  }
}))

// Mock Icon component
vi.mock('#icon', () => ({
  default: {
    template: '<i :class="name" />',
    props: ['name', 'size']
  }
}))

describe('DevModeIndicator', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    vi.mock('#app', () => ({
      useRuntimeConfig: () => mockRuntimeConfig
    }))

    // Mock useAuthStore
    const mockAuthStore = {
      user: {
        id: 'user-1',
        name: '开发测试用户',
        email: 'dev@meeting-manage.local',
        roles: ['ADMIN']
      }
    }

    vi.mock('~/stores/auth', () => ({
      useAuthStore: () => mockAuthStore
    }))

    // Mock $fetch
    global.$fetch = vi.fn().mockResolvedValue({
      timestamp: '2025-01-01T00:00:00.000Z',
      environment: 'development',
      checks: {},
      overall: {
        safe: true
      }
    })
  })

  const createWrapper = (props = {}) => {
    return mount(DevModeIndicator, {
      props: {
        position: 'top-right',
        variant: 'badge',
        animated: true,
        closable: false,
        showUser: true,
        showEnvironment: true,
        showActions: true,
        allowSwitch: true,
        ...props
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          Dialog: true,
          Message: true,
          Button: true,
          Chip: true,
          Avatar: true,
          Icon: true
        }
      }
    })
  }

  it('在开发环境且启用自动登录时应该显示指示器', () => {
    wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.dev-mode-indicator').exists()).toBe(true)
  })

  it('在非开发环境下不应该显示指示器', () => {
    vi.doMock('#app', () => ({
      useRuntimeConfig: () => ({
        public: {
          isDevelopment: false,
          devAutoLoginEnabled: false
        }
      })
    }))

    wrapper = createWrapper()
    expect(wrapper.find('.dev-mode-indicator').exists()).toBe(false)
  })

  it('应该显示正确的标题', () => {
    wrapper = createWrapper({ title: '测试模式' })
    expect(wrapper.find('.dev-mode-title').text()).toBe('测试模式')
  })

  it('应该显示当前用户信息', () => {
    wrapper = createWrapper({ showUser: true })

    const userInfo = wrapper.find('.dev-mode-user')
    expect(userInfo.exists()).toBe(true)
    expect(userInfo.text()).toContain('开发测试用户')
    expect(userInfo.text()).toContain('dev@meeting-manage.local')
  })

  it('应该显示环境信息', () => {
    wrapper = createWrapper({ showEnvironment: true })

    const envInfo = wrapper.find('.dev-mode-environment')
    expect(envInfo.exists()).toBe(true)
    expect(envInfo.text()).toContain('Development')
  })

  it('应该显示操作按钮', () => {
    wrapper = createWrapper({ showActions: true })

    const actions = wrapper.find('.dev-mode-actions')
    expect(actions.exists()).toBe(true)
  })

  it('应该支持不同位置', () => {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

    positions.forEach(position => {
      const testWrapper = createWrapper({ position: position as any })
      expect(testWrapper.find(`.position-${position}`).exists()).toBe(true)
    })
  })

  it('应该支持不同变体', () => {
    const variants = ['badge', 'banner', 'compact']

    variants.forEach(variant => {
      const testWrapper = createWrapper({ variant: variant as any })
      expect(testWrapper.find(`.variant-${variant}`).exists()).toBe(true)
    })
  })

  it('应该支持动画效果', () => {
    wrapper = createWrapper({ animated: true })
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
  })

  it('应该支持关闭功能', async () => {
    const onClose = vi.fn()
    wrapper = createWrapper({ closable: true })
    wrapper.vm.$emit('close')

    expect(onClose).toHaveBeenCalled()
  })

  it('应该支持用户切换功能', async () => {
    const onSwitchUser = vi.fn()
    wrapper = createWrapper({ allowSwitch: true })
    wrapper.vm.$emit('switchUser')

    expect(onSwitchUser).toHaveBeenCalled()
  })

  it('应该显示安全信息对话框', async () => {
    wrapper = createWrapper()

    // 模拟点击安全信息按钮
    await wrapper.vm.showSecurityInfo()

    // 验证是否调用了API
    expect(global.$fetch).toHaveBeenCalledWith('/api/v1/dev/security-check')
  })

  it('应该处理API调用错误', async () => {
    // Mock API错误
    global.$fetch = vi.fn().mockRejectedValue(new Error('网络错误'))

    wrapper = createWrapper()

    // 模拟点击安全信息按钮
    await wrapper.vm.showSecurityInfo()

    // 验证是否显示了错误状态
    expect(wrapper.vm.securityReport).toBeDefined()
    expect(wrapper.vm.securityReport?.overall.safe).toBe(false)
  })

  it('应该正确格式化检查名称', () => {
    wrapper = createWrapper()

    expect(wrapper.vm.formatCheckName('environmentVariables')).toBe('环境变量检查')
    expect(wrapper.vm.formatCheckName('databaseConnection')).toBe('数据库连接检查')
    expect(wrapper.vm.formatCheckName('unknownCheck')).toBe('unknownCheck')
  })

  it('应该响应式更新显示状态', async () => {
    wrapper = createWrapper({ closable: true })

    // 初始状态应该显示
    expect(wrapper.vm.showIndicator).toBe(true)

    // 调用关闭方法
    await wrapper.vm.closeIndicator()
    expect(wrapper.vm.showIndicator).toBe(false)
  })

  it('应该处理空的用户信息', () => {
    vi.doMock('~/stores/auth', () => ({
      useAuthStore: () => ({
        user: null
      })
    }))

    wrapper = createWrapper({ showUser: true })
    expect(wrapper.vm.currentUser).toBeNull()
  })
})