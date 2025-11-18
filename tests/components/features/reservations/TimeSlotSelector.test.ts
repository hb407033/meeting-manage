import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeSlotSelector from '~/components/features/reservations/TimeSlotSelector.vue'

describe('TimeSlotSelector Component', () => {
  let wrapper: any

  const mockAvailableSlots = [
    {
      id: 'slot-1',
      startTime: new Date('2025-11-18T09:00:00'),
      endTime: new Date('2025-11-18T09:30:00'),
      status: 'available',
      roomId: 'room-1'
    },
    {
      id: 'slot-2',
      startTime: new Date('2025-11-18T10:00:00'),
      endTime: new Date('2025-11-18T10:30:00'),
      status: 'unavailable',
      roomId: 'room-1',
      reservationId: 'res-1'
    },
    {
      id: 'slot-3',
      startTime: new Date('2025-11-18T11:00:00'),
      endTime: new Date('2025-11-18T11:30:00'),
      status: 'available',
      roomId: 'room-1'
    }
  ]

  beforeEach(() => {
    wrapper = mount(TimeSlotSelector, {
      props: {
        availableSlots: mockAvailableSlots,
        selectedSlots: [],
        allowDragSelection: true,
        allowMultipleSelection: true,
        minSelectionDuration: 30,
        maxSelectionDuration: 240
      }
    })
  })

  it('renders correctly with available slots', () => {
    expect(wrapper.find('.time-slot-selector').exists()).toBe(true)
    expect(wrapper.find('.selector-toolbar').exists()).toBe(true)
    expect(wrapper.findAll('.time-slot-item')).toHaveLength(mockAvailableSlots.length)
  })

  it('displays slot information correctly', () => {
    const slots = wrapper.findAll('.time-slot-item')

    expect(slots[0].text()).toContain('09:00 - 09:30')
    expect(slots[0].text()).toContain('可用')

    expect(slots[1].text()).toContain('10:00 - 10:30')
    expect(slots[1].text()).toContain('已预约')
  })

  it('emits slotSelect event when slot is clicked', async () => {
    const availableSlot = wrapper.find('.time-slot-item')
    await availableSlot.trigger('click')

    expect(wrapper.emitted('slotSelect')).toBeTruthy()
    expect(wrapper.emitted('slotSelect')[0][0]).toEqual([mockAvailableSlots[0]])
  })

  it('allows multiple selection when enabled', async () => {
    await wrapper.setProps({ allowMultipleSelection: true })

    const slots = wrapper.findAll('.time-slot-item')
    await slots[0].trigger('click')
    await slots[2].trigger('click')

    expect(wrapper.emitted('slotSelect')).toHaveLength(2)
    expect(wrapper.emitted('selectionChange')).toHaveLength(2)
  })

  it('prevents selection of unavailable slots', async () => {
    const unavailableSlot = wrapper.findAll('.time-slot-item')[1]
    await unavailableSlot.trigger('click')

    // 不应该触发选择事件
    expect(wrapper.emitted('slotSelect')).toBeFalsy()
  })

  it('validates selection duration correctly', async () => {
    // 选择一个30分钟的时间段（符合最小要求）
    await wrapper.vm.handleTimeSlotClick(mockAvailableSlots[0])

    expect(wrapper.vm.isSelectionValid).toBe(true)

    // 模拟选择超过最大时长的时间段
    wrapper.vm.currentSelection = [
      mockAvailableSlots[0],
      mockAvailableSlots[0] // 这里需要实际的时间段逻辑
    ]

    // 验证时长计算
    expect(wrapper.vm.selectionDuration).toBe(30)
  })

  it('clears selection correctly', async () => {
    wrapper.vm.clearSelection()

    expect(wrapper.emitted('slotDeselect')).toBeTruthy()
    expect(wrapper.emitted('selectionChange')).toBeTruthy()
  })

  it('shows selection info when slots are selected', async () => {
    await wrapper.setProps({ selectedSlots: [mockAvailableSlots[0]] })

    expect(wrapper.find('.selection-info').exists()).toBe(true)
    expect(wrapper.text()).toContain('已选择 1 个时间段')
  })

  it('formats duration correctly', () => {
    expect(wrapper.vm.formatDuration(30)).toBe('30分钟')
    expect(wrapper.vm.formatDuration(90)).toBe('1小时30分钟')
    expect(wrapper.vm.formatDuration(120)).toBe('2小时')
  })

  it('applies correct CSS classes based on slot status', () => {
    const slots = wrapper.findAll('.time-slot-item')

    // 可用时间段
    expect(slots[0].classes()).toContain('bg-green-100')
    expect(slots[0].classes()).toContain('hover:bg-green-200')

    // 不可用时间段
    expect(slots[1].classes()).toContain('bg-red-100')
    expect(slots[1].classes()).toContain('hover:bg-red-200')
  })

  it('shows empty state when no slots available', async () => {
    await wrapper.setProps({ availableSlots: [] })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无可选时间段')
  })

  it('disables component when disabled prop is true', async () => {
    await wrapper.setProps({ disabled: true })

    expect(wrapper.find('.time-slot-selector').classes()).toContain('disabled')
  })

  it('handles drag selection correctly', async () => {
    const slot = wrapper.find('.time-slot-item')

    // 模拟鼠标按下
    await slot.trigger('mousedown', {
      clientX: 100,
      clientY: 100
    })

    expect(wrapper.vm.isDragging).toBe(true)
    expect(wrapper.vm.dragStartTime).toBeTruthy()
  })

  it('generates correct aria labels for accessibility', () => {
    const slot = wrapper.find('.time-slot-item')
    const ariaLabel = wrapper.vm.getSlotAriaLabel(mockAvailableSlots[0])

    expect(ariaLabel).toContain('09:00 - 09:30')
    expect(ariaLabel).toContain('available')
  })
})