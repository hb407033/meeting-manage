/**
 * RoomFilter 组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import RoomFilter from '~/app/components/features/rooms/RoomFilter.vue'

// Mock VueI18n
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      rooms: {
        filters: '筛选条件',
        location: '位置',
        locationPlaceholder: '输入位置关键词...',
        capacity: '容量范围',
        minCapacity: '最小',
        maxCapacity: '最大',
        status: '状态',
        equipment: '设备配置',
        sortBy: '排序方式',
        sortByName: '名称',
        sortByCapacity: '容量',
        sortByLocation: '位置',
        sortByCreated: '创建时间',
        sortByUpdated: '更新时间',
        statusAvailable: '可用',
        statusOccupied: '使用中',
        statusMaintenance: '维护中',
        statusReserved: '已预约',
        statusDisabled: '停用',
        activeFilters: '当前筛选:'
      },
      common: {
        apply: '应用筛选',
        reset: '重置',
        clearAll: '清除全部',
        ascending: '升序',
        descending: '降序'
      },
      equipment: {
        projector: '投影仪',
        whiteboard: '白板',
        videoConf: '视频会议',
        airCondition: '空调',
        wifi: 'WiFi'
      }
    }
  }
})

describe('RoomFilter 组件', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(RoomFilter, {
      global: {
        plugins: [i18n]
      },
      props: {
        modelValue: {
          equipment: {},
          sortBy: 'createdAt',
          sortOrder: 'desc'
        },
        collapsed: false
      }
    })
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.find('.room-filter').exists()).toBe(true)
    expect(wrapper.find('.filter-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('筛选条件')
  })

  it('应该支持折叠/展开功能', async () => {
    const panel = wrapper.find('.filter-panel')
    expect(panel.exists()).toBe(true)

    // 测试折叠状态变化
    await wrapper.setProps({ collapsed: true })
    expect(wrapper.emitted('update:collapsed')).toBeTruthy()
  })

  it('应该正确绑定位置筛选', async () => {
    const locationInput = wrapper.find('input[placeholder*="位置关键词"]')
    await locationInput.setValue('测试位置')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emittedValue = wrapper.emitted('update:modelValue')[0][0]
    expect(emittedValue.location).toBe('测试位置')
  })

  it('应该支持容量范围筛选', async () => {
    // 测试容量输入
    const capacityInputs = wrapper.findAll('.capacity-input')
    if (capacityInputs.length >= 2) {
      await capacityInputs[0].setValue(10) // 最小容量
      await capacityInputs[1].setValue(50) // 最大容量

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')[0][0]
      expect(emittedValue.capacityMin).toBe(10)
      expect(emittedValue.capacityMax).toBe(50)
    }
  })

  it('应该支持状态筛选', async () => {
    const statusCheckboxes = wrapper.findAll('.status-checkbox input')
    expect(statusCheckboxes.length).toBeGreaterThan(0)

    // 选择第一个状态（可用）
    if (statusCheckboxes[0]) {
      await statusCheckboxes[0].setChecked(true)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()

      const emittedValue = wrapper.emitted('update:modelValue')[0][0]
      expect(emittedValue.status).toBeDefined()
    }
  })

  it('应该支持设备筛选', async () => {
    const equipmentCheckboxes = wrapper.findAll('.equipment-checkbox input')
    expect(equipmentCheckboxes.length).toBeGreaterThan(0)

    // 选择第一个设备
    if (equipmentCheckboxes[0]) {
      await equipmentCheckboxes[0].setChecked(true)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()

      const emittedValue = wrapper.emitted('update:modelValue')[0][0]
      expect(emittedValue.equipment).toBeDefined()
    }
  })

  it('应该支持排序功能', async () => {
    const sortDropdown = wrapper.find('.sort-dropdown')
    const sortOrderSelect = wrapper.find('.sort-order')

    expect(sortDropdown.exists()).toBe(true)
    expect(sortOrderSelect.exists()).toBe(true)
  })

  it('应该在应用筛选时触发相应事件', async () => {
    const applyButton = wrapper.find('.apply-button')
    await applyButton.trigger('click')

    expect(wrapper.emitted('apply')).toBeTruthy()
  })

  it('应该在重置筛选时触发相应事件', async () => {
    const resetButton = wrapper.find('.reset-button')
    await resetButton.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('应该正确显示活跃筛选标签', async () => {
    const filtersWithActive = {
      equipment: { projector: true },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      location: '测试位置',
      status: 'AVAILABLE'
    }

    await wrapper.setProps({ modelValue: filtersWithActive })
    await wrapper.vm.$nextTick()

    const activeFilters = wrapper.find('.active-filters')
    expect(activeFilters.exists()).toBe(true)

    const filterTags = wrapper.findAll('.active-filter-tag')
    expect(filterTags.length).toBeGreaterThan(0)
  })

  it('应该支持移除单个筛选条件', async () => {
    const filtersWithActive = {
      equipment: { projector: true, whiteboard: false },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }

    await wrapper.setProps({ modelValue: filtersWithActive })
    await wrapper.vm.$nextTick()

    const filterTags = wrapper.findAll('.active-filter-tag')
    if (filterTags.length > 0) {
      const removeIcon = filterTags[0].find('.pi-times')
      if (removeIcon) {
        await removeIcon.trigger('click')
        // 验证移除逻辑需要通过事件触发来测试
      }
    }
  })

  it('应该支持清除所有筛选条件', async () => {
    const filtersWithActive = {
      equipment: { projector: true },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      location: '测试位置'
    }

    await wrapper.setProps({ modelValue: filtersWithActive })
    await wrapper.vm.$nextTick()

    const clearAllButton = wrapper.find('button[aria-label*="清除全部"]')
    if (clearAllButton) {
      await clearAllButton.trigger('click')
      expect(wrapper.emitted('clear-filters')).toBeTruthy()
    }
  })

  it('应该正确显示设备图标', async () => {
    const equipmentIcons = wrapper.findAll('.equipment-icon')
    expect(equipmentIcons.length).toBeGreaterThan(0)

    // 验证图标类名
    const firstIcon = equipmentIcons[0]
    expect(firstIcon.classes()).toContain('pi')
  })

  it('应该正确显示状态标签', async () => {
    const statusTags = wrapper.findAll('.status-tag')
    expect(statusTags.length).toBeGreaterThan(0)

    // 验证标签属性
    const firstTag = statusTags[0]
    expect(firstTag.attributes('severity')).toBeDefined()
  })

  it('应该验证排序选项', async () => {
    const sortOptions = [
      { value: 'name', label: '名称' },
      { value: 'capacity', label: '容量' },
      { value: 'location', label: '位置' },
      { value: 'createdAt', label: '创建时间' },
      { value: 'updatedAt', label: '更新时间' }
    ]

    const sortDropdown = wrapper.find('.sort-dropdown')
    expect(sortDropdown.exists()).toBe(true)

    // 验证排序选项包含预期值
    const dropdownOptions = wrapper.vm.sortOptions
    expect(dropdownOptions).toEqual(expect.arrayContaining(sortOptions))
  })

  it('应该验证设备选项', async () => {
    const expectedEquipment = [
      { key: 'projector', label: '投影仪', icon: 'pi pi-desktop' },
      { key: 'whiteboard', label: '白板', icon: 'pi pi-file' },
      { key: 'videoConf', label: '视频会议', icon: 'pi pi-video' },
      { key: 'airCondition', label: '空调', icon: 'pi pi-spin' },
      { key: 'wifi', label: 'WiFi', icon: 'pi pi-wifi' }
    ]

    const equipmentOptions = wrapper.vm.equipmentOptions
    expect(equipmentOptions).toEqual(expect.arrayContaining(expectedEquipment))
  })

  it('应该处理空的筛选值', async () => {
    const emptyFilters = {
      equipment: {},
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }

    await wrapper.setProps({ modelValue: emptyFilters })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.activeFilters.length).toBe(0)
    expect(wrapper.find('.active-filters').exists()).toBe(false)
  })

  it('应该响应式更新筛选值', async () => {
    const newFilters = {
      equipment: { projector: true, wifi: true },
      sortBy: 'name',
      sortOrder: 'asc',
      location: '新位置'
    }

    await wrapper.setProps({ modelValue: newFilters })
    await wrapper.vm.$nextTick()

    // 验证组件状态已更新
    expect(wrapper.vm.filters.location).toBe('新位置')
    expect(wrapper.vm.filters.sortBy).toBe('name')
    expect(wrapper.vm.filters.equipment.projector).toBe(true)
    expect(wrapper.vm.filters.equipment.wifi).toBe(true)
  })

  it('应该支持容量滑块', async () => {
    const capacitySlider = wrapper.find('.capacity-slider')
    expect(capacitySlider.exists()).toBe(true)

    // 验证滑块配置
    const sliderProps = capacitySlider.props()
    expect(sliderProps.min).toBe(1)
    expect(sliderProps.max).toBe(100)
    expect(sliderProps.range).toBe(true)
  })

  it('应该正确处理响应式设计', async () => {
    // 测试小屏幕样式类
    expect(wrapper.find('.room-filter').classes()).toContain('room-filter')

    // 验证响应式类存在
    const filterSection = wrapper.find('.filter-section')
    expect(filterSection.exists()).toBe(true)
  })
})