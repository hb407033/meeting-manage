/**
 * 会议室相关类型定义
 */

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'DISABLED'

export interface RoomEquipment {
  projector?: boolean
  whiteboard?: boolean
  videoConf?: boolean
  airCondition?: boolean
  wifi?: boolean
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
  requiresApproval?: boolean
  minBookingDuration?: number
  maxBookingDuration?: number
  allowedTimeRange?: {
    start: string
    end: string
  }
  advanceBookingDays?: number
  maxConcurrentBookings?: number
}

export interface MeetingRoom {
  id: string
  name: string
  description?: string
  capacity: number
  location?: string
  equipment?: RoomEquipment
  images?: RoomImage[]
  status: RoomStatus
  rules?: RoomRules
  requiresApproval: boolean
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
  // 关联数据
  _count?: {
    reservations: number
  }
}

export interface RoomHistory {
  id: string
  roomId: string
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  userId?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface RoomQuery {
  page?: number
  limit?: number
  status?: RoomStatus
  location?: string
  capacityMin?: number
  capacityMax?: number
  search?: string
  sortBy?: 'name' | 'capacity' | 'location' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  equipment?: Partial<RoomEquipment>
}

export interface CreateRoomInput {
  name: string
  description?: string
  capacity: number
  location?: string
  equipment?: RoomEquipment
  images?: RoomImage[]
  rules?: RoomRules
  status?: RoomStatus
}

export interface UpdateRoomInput {
  name?: string
  description?: string
  capacity?: number
  location?: string
  equipment?: RoomEquipment
  images?: RoomImage[]
  rules?: RoomRules
  status?: RoomStatus
}

export interface RoomSearchRequest {
  keyword: string
  filters?: {
    status?: RoomStatus
    capacityMin?: number
    capacityMax?: number
    location?: string
    equipment?: Partial<RoomEquipment>
  }
  pagination?: {
    page?: number
    limit?: number
  }
  sort?: {
    sortBy?: 'name' | 'capacity' | 'location' | 'createdAt' | 'updatedAt'
    sortOrder?: 'asc' | 'desc'
  }
}

export interface RoomSearchFilters {
  location?: string
  capacityMin?: number
  capacityMax?: number
  status?: RoomStatus
  equipment: Record<string, boolean>
  sortBy: string
  sortOrder: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface RoomSearchMeta extends PaginationInfo {
  searchKeyword?: string
  filters?: RoomSearchFilters
  sort?: {
    sortBy: string
    sortOrder: string
  }
}

export interface RoomSearchResponse {
  success: boolean
  data: MeetingRoom[]
  meta: RoomSearchMeta
  message: string
  timestamp: string
}

export interface BatchOperationInput {
  roomIds: string[]
  action: 'delete' | 'updateStatus' | 'export'
  data?: any
}

export interface FileUploadInput {
  roomId: string
  type: 'main' | '360' | 'video' | 'gallery'
  caption?: string
}