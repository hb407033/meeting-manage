/**
 * 周期性预约组合式函数
 */

export interface RecurringReservation {
  id: string
  title: string
  description?: string
  organizerId: string
  roomId: string
  startTime: string
  endTime: string
  recurrenceRule: string
  timezone: string
  endCondition: string
  endAfterOccurrences?: number
  endDate?: string
  status: string
  skipHolidays: boolean
  holidayRegion?: string
  bufferMinutes: number
  maxBookingAhead?: number
  notes?: string
  createdAt: string
  updatedAt: string
  organizer?: {
    id: string
    name: string
    email: string
  }
  room?: {
    id: string
    name: string
    location: string
    capacity: number
  }
  _count?: {
    reservations: number
    exceptions: number
  }
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  weekDays?: string[]
  monthlyPattern?: 'date' | 'weekday'
  monthlyDate?: number
  monthlyWeek?: number
  monthlyWeekDay?: string
  endCondition: 'never' | 'date' | 'count'
  endDate?: Date
  endCount?: number
  skipHolidays?: boolean
  holidayRegion?: string
}

export interface CreateRecurringReservationRequest {
  title: string
  description?: string
  roomId: string
  startTime: Date
  endTime: Date
  pattern: RecurrencePattern
  timezone?: string
  skipHolidays?: boolean
  holidayRegion?: string
  bufferMinutes?: number
  maxBookingAhead?: number
  notes?: string
  generateInstances?: boolean
  checkConflicts?: boolean
}

export interface RecurringReservationFilters {
  organizerId?: string
  roomId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  code: string
  message: string
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
    }
    timestamp: string
    traceId?: string
  }
}

export const useRecurringReservations = () => {
  // 状态管理
  const recurringReservations = ref<RecurringReservation[]>([])
  const currentReservation = ref<RecurringReservation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0
  })

  // 获取周期性预约列表
  const fetchRecurringReservations = async (filters: RecurringReservationFilters = {}) => {
    loading.value = true
    error.value = null

    try {
      const queryParams = new URLSearchParams()

      if (filters.roomId) queryParams.append('roomId', filters.roomId)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.page) queryParams.append('page', filters.page.toString())
      if (filters.limit) queryParams.append('limit', filters.limit.toString())

      const response: ApiResponse<{
        items: RecurringReservation[]
        total: number
        page: number
        limit: number
      }> = await $fetch(`/api/v1/reservations/recurring?${queryParams.toString()}`)

      if (response.success && response.data) {
        recurringReservations.value = response.data.items
        pagination.value = {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total
        }
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '获取周期性预约列表失败'
      console.error('获取周期性预约列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取单个周期性预约详情
  const fetchRecurringReservation = async (id: string, includeStats = false) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse<RecurringReservation> = await $fetch(
        `/api/v1/reservations/recurring/${id}?includeStats=${includeStats}`
      )

      if (response.success && response.data) {
        currentReservation.value = response.data
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '获取周期性预约详情失败'
      console.error('获取周期性预约详情失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建周期性预约
  const createRecurringReservation = async (data: CreateRecurringReservationRequest) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse<RecurringReservation> = await $fetch('/api/v1/reservations/recurring', {
        method: 'POST',
        body: {
          ...data,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          endDate: data.pattern.endDate?.toISOString()
        }
      })

      if (response.success && response.data) {
        // 刷新列表
        await fetchRecurringReservations()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '创建周期性预约失败'
      console.error('创建周期性预约失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 更新周期性预约
  const updateRecurringReservation = async (id: string, data: Partial<CreateRecurringReservationRequest>) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse<RecurringReservation> = await $fetch(`/api/v1/reservations/recurring/${id}`, {
        method: 'PUT',
        body: {
          ...data,
          startTime: data.startTime?.toISOString(),
          endTime: data.endTime?.toISOString(),
          endDate: data.pattern?.endDate?.toISOString()
        }
      })

      if (response.success && response.data) {
        // 更新当前预约
        if (currentReservation.value?.id === id) {
          currentReservation.value = response.data
        }
        // 刷新列表
        await fetchRecurringReservations()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '更新周期性预约失败'
      console.error('更新周期性预约失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除周期性预约
  const deleteRecurringReservation = async (id: string, deleteInstances = true) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse = await $fetch(`/api/v1/reservations/recurring/${id}?deleteInstances=${deleteInstances}`, {
        method: 'DELETE'
      })

      if (response.success) {
        // 从列表中移除
        recurringReservations.value = recurringReservations.value.filter(r => r.id !== id)
        // 清除当前预约
        if (currentReservation.value?.id === id) {
          currentReservation.value = null
        }
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '删除周期性预约失败'
      console.error('删除周期性预约失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取预约实例列表
  const fetchOccurrences = async (id: string, options: {
    startDate?: Date
    endDate?: Date
    maxOccurrences?: number
    includeExceptions?: boolean
  } = {}) => {
    loading.value = true
    error.value = null

    try {
      const queryParams = new URLSearchParams()

      if (options.startDate) queryParams.append('startDate', options.startDate.toISOString())
      if (options.endDate) queryParams.append('endDate', options.endDate.toISOString())
      if (options.maxOccurrences) queryParams.append('maxOccurrences', options.maxOccurrences.toString())
      if (options.includeExceptions !== undefined) queryParams.append('includeExceptions', options.includeExceptions.toString())

      const response: ApiResponse<{
        occurrences: any[]
        statistics: any
        total: number
        dateRange?: any
      }> = await $fetch(`/api/v1/reservations/recurring/${id}/occurrences?${queryParams.toString()}`)

      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '获取预约实例失败'
      console.error('获取预约实例失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 冲突检查
  const checkConflicts = async (id: string, options: {
    startDate?: Date
    endDate?: Date
    maxInstances?: number
    skipHolidays?: boolean
    includeSuggestions?: boolean
  } = {}) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse<{
        conflictResult: any
        resolutionSuggestions?: any
        checkedRange: any
        checkedInstances: number
      }> = await $fetch(`/api/v1/reservations/recurring/${id}/conflict-check`, {
        method: 'POST',
        body: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString(),
          maxInstances: options.maxInstances,
          skipHolidays: options.skipHolidays,
          includeSuggestions: options.includeSuggestions
        }
      })

      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '冲突检查失败'
      console.error('冲突检查失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建例外
  const createException = async (data: {
    recurringReservationId: string
    exceptionType: 'CANCELLED' | 'MODIFIED' | 'MOVED'
    originalStartTime: Date
    originalEndTime: Date
    newStartTime?: Date
    newEndTime?: Date
    reason?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse = await $fetch('/api/v1/reservations/recurring/exceptions', {
        method: 'POST',
        body: {
          ...data,
          originalStartTime: data.originalStartTime.toISOString(),
          originalEndTime: data.originalEndTime.toISOString(),
          newStartTime: data.newStartTime?.toISOString(),
          newEndTime: data.newEndTime?.toISOString()
        }
      })

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '创建例外失败'
      console.error('创建例外失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 批量操作
  const batchOperation = async (id: string, operation: {
    operation: 'pause' | 'resume' | 'cancel' | 'delete'
    fromDate?: Date
    reason?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const response: ApiResponse = await $fetch(`/api/v1/reservations/recurring/${id}/batch-operation`, {
        method: 'POST',
        body: {
          ...operation,
          fromDate: operation.fromDate?.toISOString()
        }
      })

      if (response.success) {
        // 刷新当前预约
        if (currentReservation.value?.id === id) {
          await fetchRecurringReservation(id)
        }
        // 刷新列表
        await fetchRecurringReservations()
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (err: any) {
      error.value = err.message || '批量操作失败'
      console.error('批量操作失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 重置状态
  const reset = () => {
    recurringReservations.value = []
    currentReservation.value = null
    loading.value = false
    error.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0
    }
  }

  return {
    // 状态
    recurringReservations: readonly(recurringReservations),
    currentReservation: readonly(currentReservation),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),

    // 方法
    fetchRecurringReservations,
    fetchRecurringReservation,
    createRecurringReservation,
    updateRecurringReservation,
    deleteRecurringReservation,
    fetchOccurrences,
    checkConflicts,
    createException,
    batchOperation,
    reset
  }
}