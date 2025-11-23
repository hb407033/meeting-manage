/**
 * 会议室状态管理
 * 使用 Pinia 进行状态管理
 */

import { defineStore } from 'pinia'
import { authStateManager } from '~/utils/auth-state-manager'

import { getApiFetch } from '~/utils/api-fetch'

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
  sortBy?: 'name' | 'capacity' | 'location' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  equipment?: {
    projector?: boolean
    whiteboard?: boolean
    videoConf?: boolean
    airCondition?: boolean
    wifi?: boolean
  }
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
      status: undefined,
      location: '',
      capacityMin: undefined as number | undefined,
      capacityMax: undefined as number | undefined,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      equipment: {}
    } as RoomQuery,
    // 搜索相关状态
    searchQuery: '',
    searchHistory: [] as string[],
    searchLoading: false,
    searchError: null as string | null,
    searchSuggestions: [] as string[],
    viewMode: 'grid' as 'grid' | 'table',
    // 搜索结果元信息
    searchMeta: {
      searchKeyword: '',
      filters: {} as any,
      sort: {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    }
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
    },

    // 检查是否有搜索查询
    hasSearchQuery: (state) => !!state.searchQuery.trim(),

    // 检查是否有活跃的筛选条件
    hasActiveFilters: (state) => {
      const { filters } = state
      return !!(filters.status || filters.location || filters.capacityMin || filters.capacityMax ||
        Object.keys(filters.equipment || {}).some(key => filters.equipment![key]))
    },

    // 获取搜索结果显示信息
    searchResultsInfo: (state) => {
      return {
        query: state.searchQuery,
        loading: state.searchLoading || state.loading,
        error: state.searchError || state.error,
        total: state.pagination.total,
        page: state.pagination.page,
        limit: state.pagination.limit,
        hasFilters: state.filters && Object.keys(state.filters).length > 0
      }
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
        status: undefined,
        location: '',
        capacityMin: undefined,
        capacityMax: undefined,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        equipment: {}
      }
    },

    // 设置搜索查询
    setSearchQuery(query: string) {
      this.searchQuery = query
      this.filters.search = query
    },

    // 清除搜索
    clearSearch() {
      this.searchQuery = ''
      this.filters.search = ''
      this.resetFilters()
    },

    // 设置视图模式
    setViewMode(mode: 'grid' | 'table') {
      this.viewMode = mode
      // 保存到本地存储
      try {
        localStorage.setItem('room-view-mode', mode)
      } catch (error) {
        console.warn('Failed to save view mode:', error)
      }
    },

    // 加载搜索历史
    loadSearchHistory() {
      try {
        const history = localStorage.getItem('room-search-history')
        if (history) {
          this.searchHistory = JSON.parse(history)
        }
      } catch (error) {
        console.warn('Failed to load search history:', error)
      }
    },

    // 保存搜索历史
    saveSearchHistory() {
      try {
        localStorage.setItem('room-search-history', JSON.stringify(this.searchHistory))
      } catch (error) {
        console.warn('Failed to save search history:', error)
      }
    },

    // 添加到搜索历史
    addToSearchHistory(query: string) {
      if (!query.trim()) return

      // 移除重复项
      const index = this.searchHistory.indexOf(query)
      if (index > -1) {
        this.searchHistory.splice(index, 1)
      }

      // 添加到开头
      this.searchHistory.unshift(query)

      // 限制历史记录数量
      if (this.searchHistory.length > 10) {
        this.searchHistory = this.searchHistory.slice(0, 10)
      }

      this.saveSearchHistory()
    },

    // 执行搜索
    async performSearch(params?: RoomQuery) {
      this.searchLoading = true
      this.searchError = null

      try {
        // 合并搜索参数
        const searchParams = {
          ...this.filters,
          ...params
        }

        // 构建查询参数
        const queryParams: any = {
          page: searchParams.page || this.pagination.page,
          limit: searchParams.limit || this.pagination.limit,
          sortBy: searchParams.sortBy || 'createdAt',
          sortOrder: searchParams.sortOrder || 'desc'
        }

        // 添加搜索关键词
        if (searchParams.search) {
          queryParams.search = searchParams.search
        }

        // 添加筛选条件
        if (searchParams.status) queryParams.status = searchParams.status
        if (searchParams.location) queryParams.location = searchParams.location
        if (searchParams.capacityMin) queryParams.capacityMin = searchParams.capacityMin
        if (searchParams.capacityMax) queryParams.capacityMax = searchParams.capacityMax

        // 添加设备筛选
        if (searchParams.equipment && Object.keys(searchParams.equipment).length > 0) {
          queryParams.equipment = searchParams.equipment
        }

        const apiFetch = getApiFetch()
        const response = await apiFetch<RoomListResponse>('/api/v1/rooms', {
          query: queryParams
        })

        this.rooms = response.data.items
        this.pagination = response.meta

        // 更新搜索元信息
        this.searchMeta = {
          searchKeyword: searchParams.search || '',
          filters: { ...searchParams },
          sort: {
            sortBy: searchParams.sortBy || 'createdAt',
            sortOrder: searchParams.sortOrder || 'desc'
          }
        }

        // 添加到搜索历史
        if (searchParams.search) {
          this.addToSearchHistory(searchParams.search)
        }

        return response

      } catch (error: any) {
        this.searchError = error.message || '搜索失败，请稍后重试'
        console.error('Search failed:', error)
        return null
      } finally {
        this.searchLoading = false
      }
    },

    // 高级搜索（POST接口）
    async performAdvancedSearch(searchData: {
      keyword: string
      filters?: any
      pagination?: any
      sort?: any
    }) {
      this.searchLoading = true
      this.searchError = null

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch<RoomListResponse>('/api/v1/rooms/search', {
          method: 'POST',
          body: searchData
        })

        this.rooms = response.data.items
        this.pagination = response.meta
        this.searchQuery = searchData.keyword

        // 更新搜索元信息
        this.searchMeta = {
          searchKeyword: searchData.keyword,
          filters: searchData.filters || {},
          sort: searchData.sort || { sortBy: 'createdAt', sortOrder: 'desc' }
        }

        // 添加到搜索历史
        this.addToSearchHistory(searchData.keyword)

        return response

      } catch (error: any) {
        this.searchError = error.message || '搜索失败，请稍后重试'
        console.error('Advanced search failed:', error)
        return null
      } finally {
        this.searchLoading = false
      }
    },

    // 获取搜索建议
    async getSearchSuggestions(query: string): Promise<string[]> {
      if (!query.trim()) return []

      try {
        // 从历史记录中获取建议
        const historySuggestions = this.searchHistory
          .filter(item => item.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5)

        // 添加一些通用建议
        const commonSuggestions = [
          `${query} 会议室`,
          `${query} 大型`,
          `${query} 小型`,
          `${query} 投影仪`,
          `${query} 白板`
        ]

        this.searchSuggestions = [...historySuggestions, ...commonSuggestions.slice(0, 5 - historySuggestions.length)]
        return this.searchSuggestions

      } catch (error) {
        console.error('Failed to get search suggestions:', error)
        return []
      }
    },

    // 初始化搜索功能
    initSearch() {
      // 加载搜索历史
      this.loadSearchHistory()

      // 加载保存的视图模式
      try {
        const savedViewMode = localStorage.getItem('room-view-mode')
        if (savedViewMode && ['grid', 'table'].includes(savedViewMode)) {
          this.viewMode = savedViewMode as 'grid' | 'table'
        }
      } catch (error) {
        console.warn('Failed to load view mode:', error)
      }
    },

    // 获取会议室列表
    async fetchRooms(params?: RoomQuery) {
      this.setLoading(true)
      this.setError(null)
      try {
        // 构建查询参数，只包含有效值
        const queryParams: any = {
          page: params?.page || this.pagination.page,
          limit: params?.limit || this.pagination.limit
        }

        // 只添加有效的筛选条件
        const allFilters = { ...this.filters, ...params }
        if (allFilters.status) queryParams.status = allFilters.status
        if (allFilters.location) queryParams.location = allFilters.location
        if (allFilters.capacityMin) queryParams.capacityMin = allFilters.capacityMin
        if (allFilters.capacityMax) queryParams.capacityMax = allFilters.capacityMax
        if (allFilters.search) queryParams.search = allFilters.search

        const apiFetch = getApiFetch()
        const response = await apiFetch<RoomListResponse>('/api/v1/rooms', {
          query: queryParams
        })

        this.rooms = response.data.items
        this.pagination = response.meta
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
        const apiFetch = getApiFetch()
        const { data } = await apiFetch<{ data: MeetingRoom }>(`/api/v1/rooms/${id}`)
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
        const apiFetch = getApiFetch()
        const { data } = await apiFetch<{ data: MeetingRoom }>('/api/v1/rooms', {
          method: 'POST',
          body: roomData
        })

        // 添加到本地状态
        this.rooms.unshift(data)
        this.currentRoom = data

        return data

      } catch (error: any) {
        const { parseApiError } = await import('~/utils/api-error-handler')
        const errorMessage = parseApiError(error)
        this.setError(errorMessage)
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
        const apiFetch = getApiFetch()
        const { data } = await apiFetch<{ data: MeetingRoom }>(`/api/v1/rooms/${id}`, {
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
        const { parseApiError } = await import('~/utils/api-error-handler')
        const errorMessage = parseApiError(error)
        this.setError(errorMessage)
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
        const apiFetch = getApiFetch()
        await apiFetch(`/api/v1/rooms/${id}`, {
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
        const apiFetch = getApiFetch()
        const formData = new FormData()
        formData.append('file', file)
        formData.append('roomId', roomId)
        formData.append('type', type)
        if (caption) {
          formData.append('caption', caption)
        }

        const { data } = await apiFetch<{ data: RoomImage }>('/api/v1/upload/rooms', {
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
    },

    // 导出会议室数据
    async exportRooms(params?: {
      status?: string
      minCapacity?: number
      maxCapacity?: number
    }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        // 构建查询参数
        const queryParams = new URLSearchParams()

        // 添加筛选条件
        if (params?.status && params.status !== 'all') {
          queryParams.append('status', params.status)
        }
        if (params?.minCapacity) {
          queryParams.append('minCapacity', params.minCapacity.toString())
        }
        if (params?.maxCapacity) {
          queryParams.append('maxCapacity', params.maxCapacity.toString())
        }

        // 构建完整的URL
        const queryString = queryParams.toString()
        const exportUrl = `/api/v1/rooms/export${queryString ? '?' + queryString : ''}`

        // 使用 $fetch.raw 发起请求
        const response = await apiFetch.raw(exportUrl)

        // 检查响应是否成功
        if (!response.ok) {
          throw new Error(`导出失败: ${response.statusText}`)
        }

        // 获取响应数据
        const csvContent = response._data as string

        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `meeting-rooms-export-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        window.URL.revokeObjectURL(url)

        return {
          success: true,
          filename: link.download,
          size: csvContent.length
        }

      } catch (error: any) {
        const { parseApiError } = await import('~/utils/api-error-handler')
        const errorMessage = parseApiError(error)
        this.setError(errorMessage)
        console.error('导出会议室数据失败:', error)
        return {
          success: false,
          error: errorMessage
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 获取房间详情（用于直接页面调用）
    async getRoomById(roomId: string) {
      const apiFetch = getApiFetch()
      return await apiFetch(`/api/v1/rooms/${roomId}`)
    },

    // 获取房间历史（用于直接页面调用）
    async getRoomHistory(roomId: string) {
      const apiFetch = getApiFetch()
      return await apiFetch(`/api/v1/rooms/${roomId}/history`)
    },

    // 更新房间信息（用于直接页面调用）
    async updateRoomData(roomId: string, data: any) {
      const apiFetch = getApiFetch()
      return await apiFetch(`/api/v1/rooms/${roomId}`, {
        method: 'PUT',
        body: data
      })
    },

    // 搜索房间（带参数）
    async searchRoomsWithParams(params: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/rooms', {
          params
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '搜索房间失败')
        console.error('搜索房间失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 高级搜索房间
    async searchRooms(searchData: any) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await (apiFetch as any)('/api/v1/rooms/search', {
          method: 'POST',
          body: searchData
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '高级搜索房间失败')
        console.error('高级搜索房间失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取房间历史记录
    async getRoomHistory(roomId: string, options: {
      startDate?: string
      endDate?: string
      page?: number
      pageSize?: number
    }) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const params = new URLSearchParams()

        if (options.startDate) params.append('startDate', options.startDate)
        if (options.endDate) params.append('endDate', options.endDate)
        if (options.page) params.append('page', options.page.toString())
        if (options.pageSize) params.append('pageSize', options.pageSize.toString())
        params.append('roomId', roomId)

        const response = await apiFetch(`/api/v1/rooms/history?${params.toString()}`)

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取房间历史记录失败')
        console.error('获取房间历史记录失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取房间可用性
    async getRoomAvailability(date: string, includeBookings = false) {
      this.setLoading(true)
      this.setError(null)

      try {
        const apiFetch = getApiFetch()
        const response = await apiFetch('/api/v1/rooms/availability', {
          query: {
            date,
            includeBookings
          }
        })

        return response.data
      } catch (error: any) {
        this.setError(error.message || '获取房间可用性失败')
        console.error('获取房间可用性失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    }
  }
})