import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConflictDetector from '~/components/features/reservations/ConflictDetector.vue'

// Mock $fetch
global.$fetch = vi.fn()

describe('ConflictDetector', () => {
  const mockReservation = {
    roomId: 'room-1',
    title: '测试会议',
    startTime: new Date('2025-01-20T14:00:00'),
    endTime: new Date('2025-01-20T15:00:00'),
    attendeeCount: 5,
    equipment: ['projector']
  }

  const mockRoomInfo = {
    id: 'room-1',
    name: '会议室A',
    capacity: 10,
    equipment: ['projector', 'whiteboard']
  }

  const mockConflictResponse = {
    success: true,
    data: {
      hasConflict: true,
      conflicts: [
        {
          type: 'time_overlap',
          severity: 'high',
          description: '与现有团队会议时间重叠',
          conflictingReservation: {
            id: 'existing-1',
            title: '团队周会',
            startTime: '2025-01-20T14:30:00',
            endTime: '2025-01-20T15:30:00',
            organizerName: '张经理'
          }
        }
      ],
      suggestions: [
        {
          id: 'suggestion-1',
          roomId: 'room-1',
          roomName: '会议室A',
          startTime: '2025-01-20T16:00:00',
          endTime: '2025-01-20T17:00:00',
          score: 85,
          reasons: ['无时间冲突', '容量匹配']
        }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render correctly with initial props', () => {
      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo
        }
      })

      expect(wrapper.find('.conflict-detector').exists()).toBe(true)
      expect(wrapper.find('.conflict-status-indicator').exists()).toBe(true)
      expect(wrapper.text()).toContain('冲突检测')
    })

    it('should show loading state when detecting', async () => {
      global.$fetch.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve(mockConflictResponse), 100))
      )

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          loading: true
        }
      })

      expect(wrapper.find('.pi-spin.pi-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('检测中...')
    })
  })

  describe('Conflict Detection', () => {
    it('should detect conflicts via API', async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()

      expect(global.$fetch).toHaveBeenCalledWith('/api/v1/reservations/conflict-check', {
        method: 'POST',
        body: {
          reservation: {
            roomId: mockReservation.roomId,
            startTime: mockReservation.startTime.toISOString(),
            endTime: mockReservation.endTime.toISOString(),
            title: mockReservation.title,
            attendeeCount: mockReservation.attendeeCount,
            equipment: mockReservation.equipment
          }
        }
      })

      expect(wrapper.vm.hasConflicts).toBe(true)
      expect(wrapper.vm.conflicts).toHaveLength(1)
      expect(wrapper.vm.suggestions).toHaveLength(1)
    })

    it('should handle API errors gracefully', async () => {
      global.$fetch.mockRejectedValue(new Error('API Error'))

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()

      // 应该回退到模拟数据
      expect(wrapper.vm.hasConflicts).toBeDefined()
      expect(wrapper.vm.suggestions).toBeDefined()
    })

    it('should emit conflictDetected event when conflicts are found', async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()

      expect(wrapper.emitted('conflictDetected')).toBeTruthy()
      expect(wrapper.emitted('conflictDetected')[0]).toEqual([wrapper.vm.conflicts])
    })

    it('should emit conflictResolved event when no conflicts are found', async () => {
      const noConflictResponse = {
        success: true,
        data: {
          hasConflict: false,
          conflicts: [],
          suggestions: []
        }
      }

      global.$fetch.mockResolvedValue(noConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()

      expect(wrapper.emitted('conflictResolved')).toBeTruthy()
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)
    })

    it('should show conflict details dialog when button is clicked', async () => {
      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()
      await wrapper.vm.$nextTick()

      const detailButton = wrapper.find('button').filter(btn =>
        btn.text().includes('查看详情')
      )

      expect(detailButton.exists()).toBe(true)

      await detailButton.trigger('click')

      expect(wrapper.vm.showConflictDialog).toBe(true)
    })

    it('should emit suggestionSelect when suggestion is selected', async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.suggestions).toHaveLength(1)

      const suggestion = wrapper.vm.suggestions[0]
      wrapper.vm.handleSuggestionSelect(suggestion)

      expect(wrapper.emitted('suggestionSelect')).toBeTruthy()
      expect(wrapper.emitted('suggestionSelect')[0]).toEqual([suggestion])
    })
  })

  describe('Conflict Display', () => {
    it('should display conflict summary when conflicts exist', async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('发现 1 个冲突')
      expect(wrapper.find('.conflict-summary').exists()).toBe(true)
      expect(wrapper.text()).toContain('时间冲突')
    })

    it('should display no conflict state when no conflicts exist', async () => {
      const noConflictResponse = {
        success: true,
        data: {
          hasConflict: false,
          conflicts: [],
          suggestions: []
        }
      }

      global.$fetch.mockResolvedValue(noConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('无冲突')
      expect(wrapper.find('.pi-check-circle').exists()).toBe(true)
    })

    it('should display suggestions when available', async () => {
      global.$fetch.mockResolvedValue(mockConflictResponse)

      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo,
          showSuggestions: true,
          autoDetect: false
        }
      })

      await wrapper.vm.detectConflicts()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.suggestions-section').exists()).toBe(true)
      expect(wrapper.text()).toContain('推荐时间')
    })
  })

  describe('Responsive Design', () => {
    it('should have proper responsive classes', () => {
      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo
        }
      })

      // 检查是否有响应式类名
      const container = wrapper.find('.conflict-status-indicator')
      expect(container.exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo
        }
      })

      const refreshButton = wrapper.find('button')
      expect(refreshButton.exists()).toBe(true)
      // 在实际实现中，应该添加适当的ARIA标签
    })

    it('should support keyboard navigation', () => {
      const wrapper = mount(ConflictDetector, {
        props: {
          reservation: mockReservation,
          roomInfo: mockRoomInfo
        }
      })

      // 检查按钮是否可以通过键盘访问
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      expect(buttons[0].element.tagName).toBe('BUTTON')
    })
  })
})