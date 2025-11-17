/**
 * 会议室状态管理
 * 使用 Pinia 进行状态管理
 */

import { defineStore } from 'pinia'

export interface RoomEquipment {
  projector: boolean
  whiteboard: boolean
  videoConf: boolean
  airCondition: boolean
  wifi: boolean
  customEquipment?: string[]
}

export interface RoomImage {
  url: string
  type: 'main' | '360' | 'video' | 'gallery'
  caption?: string
  size?: number
  uploadedAt?: string
}

export interface RoomRules {
  requiresApproval: boolean
  minBookingDuration: number
  maxBookingDuration: number
  allowedTimeRange?: {
    start: string
    end: string
  }
  advanceBookingDays: number
  maxConcurrentBookings: number
}

export interface MeetingRoom {
  id: string
  name: string
  description?: string
  capacity: number
  location?: string
  equipment?: RoomEquipment
  images?: RoomImage[]
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'DISABLED'
  rules?: RoomRules
  requiresApproval: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
  _count?: {
    reservations: number
  }
}

export interface RoomQuery {
  page?: number
  limit?: number
  status?: string
  location?: string
  capacityMin?: number
  capacityMax?: number
  search?: string
  sortBy?: 'name' | 'capacity' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface RoomListResponse {
  data: MeetingRoom[]
  meta: PaginationMeta
}

export const useRoomStore = defineStore('rooms', {
  state: () => ({
    rooms: [] as MeetingRoom[],
    currentRoom: null as MeetingRoom | null,
    loading: false,
    error: null as string | null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    } as PaginationMeta,
    filters: {
      status: '',
      location: '',
      capacityMin: undefined as number | undefined,
      capacityMax: undefined as number | undefined,
      search: ''
    } as RoomQuery
  }),

  getters: {
    // 获取可用会议室
    availableRooms: (state) => state.rooms.filter(room => room.status === 'AVAILABLE'),

    // 获取维护中的会议室
    maintenanceRooms: (state) => state.rooms.filter(room => room.status === 'MAINTENANCE'),

    // 根据位置过滤会议室
    roomsByLocation: (state) => (location: string) =>
      state.rooms.filter(room => room.location?.includes(location)),

    // 根据容量过滤会议室
    roomsByCapacity: (state) => (minCapacity: number) =>
      state.rooms.filter(room => room.capacity >= minCapacity),

    // 获取会议室主图片
    getMainImage: () => (room: MeetingRoom) =>
      room.images?.find(img => img.type === 'main') || room.images?.[0],

    // 获取会议室状态显示文本
    getStatusText: () => (status: string) => {
      const statusMap = {
        'AVAILABLE': '可用',
        'OCCUPIED': '使用中',
        'MAINTENANCE': '维护中',
        'RESERVED': '已预约',
        'DISABLED': '禁用'
      }
      return statusMap[status as keyof typeof statusMap] || status
    },

    // 获取会议室状态颜色
    getStatusColor: () => (status: string) => {
      const colorMap = {
        'AVAILABLE': 'green',
        'OCCUPIED': 'red',
        'MAINTENANCE': 'orange',
        'RESERVED': 'blue',
        'DISABLED': 'gray'
      }
      return colorMap[status as keyof typeof colorMap] || 'gray'
    }
  },

  actions: {
    // 设置加载状态
    setLoading(loading: boolean) {
      this.loading = loading
    },

    // 设置错误信息
    setError(error: string | null) {
      this.error = error
    },

    // 设置当前会议室
    setCurrentRoom(room: MeetingRoom | null) {
      this.currentRoom = room
    },

    // 设置过滤器
    setFilters(filters: Partial<RoomQuery>) {
      this.filters = { ...this.filters, ...filters }
    },

    // 重置过滤器
    resetFilters() {
      this.filters = {
        status: '',
        location: '',
        capacityMin: undefined,
        capacityMax: undefined,
        search: ''
      }
    },

    // 获取会议室列表
    async fetchRooms(params?: RoomQuery) {
      this.setLoading(true)
      this.setError(null)

      try {
        const queryParams = {
          page: params?.page || this.pagination.page,
          limit: params?.limit || this.pagination.limit,
          ...this.filters,
          ...params
        }

        const { data } = await $fetch<RoomListResponse>('/api/v1/rooms', {
          query: queryParams
        })

        this.rooms = data.data
        this.pagination = data.meta
        this.currentRoom = null

      } catch (error: any) {
        this.setError(error.message || '获取会议室列表失败')
        console.error('获取会议室列表失败:', error)
      } finally {
        this.setLoading(false)
      }
    },

    // 获取会议室详情
    async fetchRoom(id: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { data } = await $fetch<{ data: MeetingRoom }>(`/api/v1/rooms/${id}`)
        this.currentRoom = data
        return data

      } catch (error: any) {
        this.setError(error.message || '获取会议室详情失败')
        console.error('获取会议室详情失败:', error)
        return null
      } finally {
        this.setLoading(false)
      }
    },

    // 创建会议室
    async createRoom(roomData: Partial<MeetingRoom>) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { data } = await $fetch<{ data: MeetingRoom }>('/api/v1/rooms', {
          method: 'POST',
          body: roomData
        })

        // 添加到本地状态
        this.rooms.unshift(data)
        this.currentRoom = data

        return data

      } catch (error: any) {
        this.setError(error.message || '创建会议室失败')
        console.error('创建会议室失败:', error)
        return null
      } finally {
        this.setLoading(false)
      }
    },

    // 更新会议室
    async updateRoom(id: string, roomData: Partial<MeetingRoom>) {
      this.setLoading(true)
      this.setError(null)

      try {
        const { data } = await $fetch<{ data: MeetingRoom }>(`/api/v1/rooms/${id}`, {
          method: 'PUT',
          body: roomData
        })

        // 更新本地状态
        const index = this.rooms.findIndex(room => room.id === id)
        if (index !== -1) {
          this.rooms[index] = data
        }

        if (this.currentRoom?.id === id) {
          this.currentRoom = data
        }

        return data

      } catch (error: any) {
        this.setError(error.message || '更新会议室失败')
        console.error('更新会议室失败:', error)
        return null
      } finally {
        this.setLoading(false)
      }
    },

    // 删除会议室
    async deleteRoom(id: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        await $fetch(`/api/v1/rooms/${id}`, {
          method: 'DELETE'
        })

        // 从本地状态移除
        this.rooms = this.rooms.filter(room => room.id !== id)
        if (this.currentRoom?.id === id) {
          this.currentRoom = null
        }

        return true

      } catch (error: any) {
        this.setError(error.message || '删除会议室失败')
        console.error('删除会议室失败:', error)
        return false
      } finally {
        this.setLoading(false)
      }
    },

    // 更新会议室状态
    async updateRoomStatus(id: string, status: MeetingRoom['status']) {
      return this.updateRoom(id, { status })
    },

    // 上传会议室图片
    async uploadRoomImage(roomId: string, file: File, type: string = 'gallery', caption?: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('roomId', roomId)
        formData.append('type', type)
        if (caption) {
          formData.append('caption', caption)
        }

        const { data } = await $fetch<{ data: RoomImage }>('/api/v1/upload/rooms', {
          method: 'POST',
          body: formData
        })

        // 更新本地状态
        const room = this.rooms.find(r => r.id === roomId)
        if (room && room.images) {
          room.images.push(data)
        }

        if (this.currentRoom?.id === roomId && this.currentRoom.images) {
          this.currentRoom.images.push(data)
        }

        return data

      } catch (error: any) {
        this.setError(error.message || '上传图片失败')
        console.error('上传图片失败:', error)
        return null
      } finally {
        this.setLoading(false)
      }
    }
  }
})