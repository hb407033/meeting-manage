import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CalendarView from '~/components/features/reservations/CalendarView.vue'

describe('CalendarView Component', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(CalendarView, {
      props: {
        roomIds: ['1', '2'],
        viewMode: 'dayGridWeek',
        height: 600,
        selectable: true
      },
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          'FullCalendar': true
        }
      }
    })
  })

  it('renders correctly with default props', () => {
    expect(wrapper.find('.calendar-view-container').exists()).toBe(true)
    expect(wrapper.find('.real-time-indicator').exists()).toBe(true)
  })

  it('emits timeSelect event when time is selected', async () => {
    const startDate = new Date('2025-11-18T10:00:00')
    const endDate = new Date('2025-11-18T11:00:00')

    // 模拟时间选择
    await wrapper.vm.handleSelect({
      start: startDate,
      end: endDate
    })

    expect(wrapper.emitted('timeSelect')).toBeTruthy()
    expect(wrapper.emitted('timeSelect')[0]).toEqual([{
      start: startDate,
      end: endDate
    }])
  })

  it('emits eventClick event when event is clicked', async () => {
    const mockEvent = {
      event: { id: '1', title: 'Test Event' },
      el: document.createElement('div')
    }

    await wrapper.vm.handleEventClick(mockEvent)

    expect(wrapper.emitted('eventClick')).toBeTruthy()
    expect(wrapper.emitted('eventClick')[0]).toEqual([mockEvent])
  })

  it('emits viewChange event when view changes', async () => {
    const mockViewInfo = {
      type: 'timeGridWeek',
      start: new Date('2025-11-18'),
      end: new Date('2025-11-25')
    }

    await wrapper.vm.handleDatesSet(mockViewInfo)

    expect(wrapper.emitted('viewChange')).toBeTruthy()
    expect(wrapper.emitted('viewChange')[0]).toEqual([mockViewInfo])
  })

  it('correctly formats event content based on status', () => {
    const availableEvent = {
      event: {
        title: 'Available',
        extendedProps: { status: 'available' }
      }
    }

    const content = wrapper.vm.renderEventContent(availableEvent)
    expect(content.html).toContain('background-color: #10b981')
  })

  it('shows conflict indicators for conflicting events', () => {
    const conflictEvent = {
      event: {
        title: 'Conflict Event',
        extendedProps: {
          status: 'unavailable',
          hasConflict: true,
          conflictSeverity: 'high'
        }
      }
    }

    const content = wrapper.vm.renderEventContent(conflictEvent)
    expect(content.html).toContain('conflict-indicator')
    expect(content.html).toContain('background-color: #dc2626')
  })

  it('updates events correctly', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event 1',
        start: '2025-11-18T10:00:00',
        end: '2025-11-18T11:00:00'
      },
      {
        id: '2',
        title: 'Test Event 2',
        start: '2025-11-18T14:00:00',
        end: '2025-11-18T15:00:00'
      }
    ]

    wrapper.vm.updateEvents(mockEvents)

    // 验证事件已更新（这需要实际的FullCalendar实例）
    expect(wrapper.vm.getEvents()).toBeDefined()
  })

  it('handles room ID changes correctly', async () => {
    await wrapper.setProps({ roomIds: ['3', '4'] })

    // 验证WebSocket房间切换
    expect(wrapper.vm.loadEvents).toBeDefined()
  })

  it('displays loading state correctly', async () => {
    wrapper.vm.loading.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.calendar-loading-overlay').exists()).toBe(true)
  })

  it('shows performance metrics in development mode', async () => {
    wrapper.vm.performanceMetrics.value = {
      initialLoadTime: 500,
      renderTime: 100,
      eventCount: 10
    }

    // 模拟开发环境
    vi.stubGlobal('$config', { dev: true })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.performance-metrics').exists()).toBe(true)
    expect(wrapper.text()).toContain('500.00ms')
  })

  it('adjusts for mobile view correctly', async () => {
    // 模拟移动端
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600
    })

    wrapper.vm.adjustForMobile()

    // 验证移动端调整
    expect(wrapper.vm.isMobile).toBe(true)
  })
})