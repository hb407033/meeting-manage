/**
 * 会议室搜索 Composable
 * 集成搜索、筛选、分页和性能优化功能
 */

import { ref, computed, reactive, watch } from 'vue'
import { useDebounce, debounce } from './useDebounce'
import { useRoomsStore } from '~/stores/rooms'
import type { MeetingRoom } from '~~/types/room'

const roomsStore = useRoomsStore()

interface SearchFilters {
  location?: string
  capacityMin?: number
  capacityMax?: number
  status?: string
  equipment: Record<string, boolean>
  sortBy: string
  sortOrder: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface SearchState {
  query: string
  filters: SearchFilters
  pagination: PaginationInfo
  results: MeetingRoom[]
  loading: boolean
  error: string | null
  searchHistory: string[]
  viewMode: 'grid' | 'table'
}

const DEFAULT_FILTERS: SearchFilters = {
  equipment: {},
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
}

export function useRoomSearch() {
  // 搜索状态
  const searchState = reactive<SearchState>({
    query: '',
    filters: { ...DEFAULT_FILTERS },
    pagination: { ...DEFAULT_PAGINATION },
    results: [],
    loading: false,
    error: null,
    searchHistory: [],
    viewMode: 'grid'
  })

  // 防抖搜索查询
  const { debouncedValue: debouncedQuery, value: searchInput, flush } = useDebounce(
    searchState.query,
    300
  )

  // 计算属性
  const hasSearchQuery = computed(() => !!searchState.query.trim())
  const hasActiveFilters = computed(() => {
    return Object.entries(searchState.filters).some(([key, value]) => {
      if (key === 'equipment') {
        return Object.values(value as Record<string, boolean>).some(v => v === true)
      }
      return value !== undefined && value !== '' && value !== DEFAULT_FILTERS[key as keyof SearchFilters]
    })
  })

  const totalResults = computed(() => searchState.pagination.total)
  const currentPage = computed(() => searchState.pagination.page)
  const totalPages = computed(() => searchState.pagination.totalPages)

  // 加载搜索历史
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('room-search-history')
      if (history) {
        searchState.searchHistory = JSON.parse(history)
      }
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }

  // 保存搜索历史
  const saveSearchHistory = () => {
    try {
      localStorage.setItem('room-search-history', JSON.stringify(searchState.searchHistory))
    } catch (error) {
      console.warn('Failed to save search history:', error)
    }
  }

  // 添加到搜索历史
  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return

    // 移除重复项
    const index = searchState.searchHistory.indexOf(query)
    if (index > -1) {
      searchState.searchHistory.splice(index, 1)
    }

    // 添加到开头
    searchState.searchHistory.unshift(query)

    // 限制历史记录数量
    if (searchState.searchHistory.length > 10) {
      searchState.searchHistory = searchState.searchHistory.slice(0, 10)
    }

    saveSearchHistory()
  }

  // 构建搜索参数
  const buildSearchParams = () => {
    const params: any = {
      page: searchState.pagination.page,
      limit: searchState.pagination.limit,
      sortBy: searchState.filters.sortBy,
      sortOrder: searchState.filters.sortOrder
    }

    // 添加搜索关键词
    if (debouncedQuery.value.trim()) {
      params.search = debouncedQuery.value.trim()
    }

    // 添加筛选条件
    if (searchState.filters.location) {
      params.location = searchState.filters.location
    }

    if (searchState.filters.capacityMin) {
      params.capacityMin = searchState.filters.capacityMin
    }

    if (searchState.filters.capacityMax) {
      params.capacityMax = searchState.filters.capacityMax
    }

    if (searchState.filters.status) {
      params.status = searchState.filters.status
    }

    // 添加设备筛选
    const activeEquipment = Object.entries(searchState.filters.equipment)
      .filter(([_, value]) => value === true)
      .reduce((acc, [key, _]) => {
        acc[key] = true
        return acc
      }, {} as Record<string, boolean>)

    if (Object.keys(activeEquipment).length > 0) {
      params.equipment = activeEquipment
    }

    return params
  }

  // 执行搜索
  const performSearch = async (resetPage: boolean = false) => {
    try {
      searchState.loading = true
      searchState.error = null

      if (resetPage) {
        searchState.pagination.page = 1
      }

      const params = buildSearchParams()

      // 调用搜索API
      const response = await roomsStore.searchRoomsWithParams(params)

      if (response.success) {
        searchState.results = response.data || []
        searchState.pagination = {
          ...searchState.pagination,
          ...response.meta
        }

        // 如果有搜索查询，添加到历史记录
        if (searchState.query.trim()) {
          addToSearchHistory(searchState.query.trim())
        }
      } else {
        throw new Error(response.message || '搜索失败')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      searchState.error = error.message || '搜索失败，请稍后重试'
      searchState.results = []
    } finally {
      searchState.loading = false
    }
  }

  // 执行高级搜索（使用POST接口）
  const performAdvancedSearch = async (searchData: {
    keyword: string
    filters?: any
    pagination?: any
    sort?: any
  }) => {
    try {
      searchState.loading = true
      searchState.error = null

      const response = await roomsStore.searchRooms(searchData)

      if (response.success) {
        searchState.results = response.data || []
        searchState.pagination = {
          ...searchState.pagination,
          ...response.meta
        }
        searchState.query = searchData.keyword

        addToSearchHistory(searchData.keyword)
      } else {
        throw new Error(response.message || '搜索失败')
      }
    } catch (error: any) {
      console.error('Advanced search error:', error)
      searchState.error = error.message || '搜索失败，请稍后重试'
      searchState.results = []
    } finally {
      searchState.loading = false
    }
  }

  // 设置搜索查询
  const setSearchQuery = (query: string) => {
    searchState.query = query
    searchInput.value = query
  }

  // 更新筛选条件
  const updateFilters = (filters: Partial<SearchFilters>) => {
    Object.assign(searchState.filters, filters)
  }

  // 重置筛选条件
  const resetFilters = () => {
    searchState.filters = { ...DEFAULT_FILTERS }
    searchState.pagination.page = 1
  }

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('')
    resetFilters()
    searchState.results = []
    searchState.error = null
  }

  // 处理分页变化
  const handlePageChange = async (pageInfo: any) => {
    searchState.pagination.page = pageInfo.page + 1 // PrimeVue Paginator 是0-based
    await performSearch()
  }

  // 应用筛选条件
  const applyFilters = async () => {
    await performSearch(true)
  }

  // 设置视图模式
  const setViewMode = (mode: 'grid' | 'table') => {
    searchState.viewMode = mode
    try {
      localStorage.setItem('room-search-view-mode', mode)
    } catch (error) {
      console.warn('Failed to save view mode:', error)
    }
  }

  // 获取搜索建议
  const getSearchSuggestions = async (query: string): Promise<string[]> => {
    // 这里可以实现搜索建议逻辑
    // 例如基于历史记录、热门搜索等
    if (!query.trim()) return []

    const suggestions = searchState.searchHistory
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

    return [...suggestions, ...commonSuggestions.slice(0, 5 - suggestions.length)]
  }

  // 监听防抖查询变化，自动执行搜索
  watch(debouncedQuery, () => {
    if (debouncedQuery.value.trim() || hasActiveFilters.value) {
      performSearch(true)
    }
  })

  // 监听筛选条件变化，自动执行搜索
  watch(
    () => searchState.filters,
    () => {
      if (hasSearchQuery.value || hasActiveFilters.value) {
        performSearch(true)
      }
    },
    { deep: true }
  )

  // 初始化
  const init = () => {
    loadSearchHistory()

    // 加载保存的视图模式
    try {
      const savedViewMode = localStorage.getItem('room-search-view-mode')
      if (savedViewMode && ['grid', 'table'].includes(savedViewMode)) {
        searchState.viewMode = savedViewMode as 'grid' | 'table'
      }
    } catch (error) {
      console.warn('Failed to load view mode:', error)
    }
  }

  // 初始化组件
  init()

  return {
    // 状态
    searchState: reactive(searchState),

    // 计算属性
    hasSearchQuery,
    hasActiveFilters,
    totalResults,
    currentPage,
    totalPages,

    // 方法
    setSearchQuery,
    updateFilters,
    resetFilters,
    clearSearch,
    applyFilters,
    performSearch,
    performAdvancedSearch,
    handlePageChange,
    setViewMode,
    getSearchSuggestions,

    // 搜索历史
    addToSearchHistory,
    loadSearchHistory,

    // 防抖值
    searchInput,
    flush
  }
}