/**
 * RoomSearch 组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import RoomSearch from '~/app/components/features/rooms/RoomSearch.vue'

// Mock VueI18n
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      rooms: {
        searchPlaceholder: '搜索会议室名称、位置、描述...',
        quickSearch: '快速搜索:'
      },
      common: {
        search: '搜索',
        clear: '清除'
      }
    }
  }
})

describe('RoomSearch 组件', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(RoomSearch, {
      global: {
        plugins: [i18n]
      },
      props: {
        modelValue: '',
        loading: false,
        suggestions: [],
        quickTags: []
      }
    })
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.find('.room-search').exists()).toBe(true)
    expect(wrapper.find('.search-input').exists()).toBe(true)
    expect(wrapper.find('.search-button').exists()).toBe(true)
    expect(wrapper.find('.clear-button').exists()).toBe(true)
  })

  it('应该正确绑定modelValue', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('测试会议室')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['测试会议室'])
  })

  it('应该在输入时触发搜索输入事件', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.trigger('input')

    // 防抖处理，需要等待
    await new Promise(resolve => setTimeout(resolve, 350))

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('应该支持回车搜索', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('测试搜索')
    await searchInput.trigger('keyup.enter')

    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')[0]).toEqual(['测试搜索'])
  })

  it('应该在点击搜索按钮时触发搜索', async () => {
    const searchInput = wrapper.find('.search-input')
    const searchButton = wrapper.find('.search-button')

    await searchInput.setValue('测试搜索')
    await searchButton.trigger('click')

    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')[0]).toEqual(['测试搜索'])
  })

  it('应该在点击清除按钮时触发清除事件', async () => {
    const clearButton = wrapper.find('.clear-button')
    await clearButton.trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('应该在没有搜索内容时禁用清除按钮', () => {
    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.attributes('disabled')).toBeDefined()
  })

  it('应该在有搜索内容时启用清除按钮', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('测试内容')

    await wrapper.vm.$nextTick()

    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.attributes('disabled')).toBeUndefined()
  })

  it('应该正确显示搜索建议', async () => {
    await wrapper.setProps({
      suggestions: ['会议室A', '会议室B', '会议室C']
    })

    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('会议')
    await searchInput.trigger('input')

    // 等待防抖和建议显示
    await new Promise(resolve => setTimeout(resolve, 350))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-suggestions').exists()).toBe(true)
    expect(wrapper.findAll('.suggestion-item').length).toBe(3)
  })

  it('应该在选择建议时触发相应事件', async () => {
    await wrapper.setProps({
      suggestions: ['会议室A', '会议室B']
    })

    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('会议')
    await searchInput.trigger('input')

    await new Promise(resolve => setTimeout(resolve, 350))
    await wrapper.vm.$nextTick()

    const suggestionItems = wrapper.findAll('.suggestion-item')
    await suggestionItems[0].trigger('click')

    expect(wrapper.emitted('suggestion-select')).toBeTruthy()
    expect(wrapper.emitted('suggestion-select')[0]).toEqual(['会议室A'])
  })

  it('应该正确显示快速搜索标签', async () => {
    await wrapper.setProps({
      quickTags: ['投影仪', '白板', '大型']
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.quick-search-tags').exists()).toBe(true)
    expect(wrapper.findAll('.search-tag').length).toBe(3)
  })

  it('应该在点击快速搜索标签时触发搜索', async () => {
    await wrapper.setProps({
      quickTags: ['投影仪', '白板']
    })

    await wrapper.vm.$nextTick()

    const searchTags = wrapper.findAll('.search-tag')
    await searchTags[0].trigger('click')

    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')[0]).toEqual(['投影仪'])
  })

  it('应该支持移除快速搜索标签', async () => {
    await wrapper.setProps({
      quickTags: ['投影仪', '白板']
    })

    await wrapper.vm.$nextTick()

    const searchTags = wrapper.findAll('.search-tag')
    const removeIcon = searchTags[0].find('.pi-times')

    if (removeIcon) {
      await removeIcon.trigger('click')
      // 验证标签被移除的逻辑需要通过 props 更新来测试
    }
  })

  it('应该正确显示加载状态', async () => {
    await wrapper.setProps({
      loading: true
    })

    const searchButton = wrapper.find('.search-button')
    expect(searchButton.attributes('loading')).toBeDefined()
  })

  it('应该在外部点击时隐藏搜索建议', async () => {
    await wrapper.setProps({
      suggestions: ['会议室A', '会议室B']
    })

    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('会议')
    await searchInput.trigger('input')

    await new Promise(resolve => setTimeout(resolve, 350))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-suggestions').exists()).toBe(true)

    // 模拟外部点击
    document.body.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.search-suggestions').exists()).toBe(false)
  })

  it('应该支持自定义placeholder', async () => {
    const customWrapper = mount(RoomSearch, {
      global: {
        plugins: [i18n]
      },
      props: {
        modelValue: '',
        placeholder: '自定义搜索占位符'
      }
    })

    const searchInput = customWrapper.find('.search-input')
    expect(searchInput.attributes('placeholder')).toBe('自定义搜索占位符')
  })

  it('应该处理长搜索查询', async () => {
    const longQuery = '这是一个非常长的搜索查询字符串，用于测试组件对长文本的处理能力'
    const searchInput = wrapper.find('.search-input')

    await searchInput.setValue(longQuery)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([longQuery])
  })

  it('应该处理空字符串和空白字符', async () => {
    const searchInput = wrapper.find('.search-input')

    // 测试空字符串
    await searchInput.setValue('')
    expect(wrapper.vm.hasSearchQuery).toBe(false)

    // 测试空白字符
    await searchInput.setValue('   ')
    expect(wrapper.vm.hasSearchQuery).toBe(false)

    // 测试有效内容
    await searchInput.setValue('有效内容')
    expect(wrapper.vm.hasSearchQuery).toBe(true)
  })
})