import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ExampleComponent from '#components/ExampleComponent.vue'

// 模拟组件用于测试
const ExampleComponent = {
  template: `
    <div class="example-component">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <button @click="increment">Count: {{ count }}</button>
      <button @click="reset">Reset</button>
    </div>
  `,
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: '这是一个示例组件'
    }
  },
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    },
    reset() {
      this.count = 0
    }
  }
}

describe('ExampleComponent', () => {
  it('应该正确渲染组件', () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        title: '测试标题'
      }
    })

    expect(wrapper.find('h1').text()).toBe('测试标题')
    expect(wrapper.find('p').text()).toBe('这是一个示例组件')
    expect(wrapper.find('.example-component').exists()).toBe(true)
  })

  it('应该正确处理自定义描述', () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        title: '测试标题',
        description: '自定义描述'
      }
    })

    expect(wrapper.find('p').text()).toBe('自定义描述')
  })

  it('应该正确处理计数功能', async () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        title: '测试标题'
      }
    })

    const button = wrapper.find('button')
    expect(button.text()).toContain('Count: 0')

    await button.trigger('click')
    expect(button.text()).toContain('Count: 1')

    await button.trigger('click')
    expect(button.text()).toContain('Count: 2')
  })

  it('应该正确处理重置功能', async () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        title: '测试标题'
      }
    })

    const buttons = wrapper.findAll('button')

    // 增加计数
    await buttons[0].trigger('click')
    await buttons[0].trigger('click')
    expect(buttons[0].text()).toContain('Count: 2')

    // 重置计数
    await buttons[1].trigger('click')
    expect(buttons[0].text()).toContain('Count: 0')
  })

  it('应该验证必需的props', () => {
    expect(() => {
      mount(ExampleComponent)
    }).toThrow()

    expect(() => {
      mount(ExampleComponent, {
        props: {
          title: '测试标题'
        }
      })
    }).not.toThrow()
  })

  it('应该正确处理数据属性', async () => {
    const wrapper = mount(ExampleComponent, {
      props: {
        title: '测试标题'
      }
    })

    expect(wrapper.vm.count).toBe(0)

    await wrapper.vm.increment()
    expect(wrapper.vm.count).toBe(1)

    await wrapper.vm.reset()
    expect(wrapper.vm.count).toBe(0)
  })
})